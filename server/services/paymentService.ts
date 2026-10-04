import crypto from 'crypto';
import { getDb, savePersistentStore } from '../config/db';
import { IPayment, PaymentStatus } from '../models/schemas';
import { AppError } from '../utils/apiResponse';

const PROVIDER_KEY = process.env.PAYMENT_PROVIDER_KEY || 'pk_test_aethelgard_sandbox';
const PROVIDER_SECRET = process.env.PAYMENT_PROVIDER_SECRET || 'sk_test_aethelgard_sandbox_secret_991';
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_aethelgard_webhook_991';

export interface CreatePaymentOrderInput {
  userId: string;
  amount: number;
  currency?: string;
  method: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';
  metadata?: Record<string, string>;
}

export function computePaymentSignature(providerOrderId: string, providerPaymentId: string): string {
  return crypto
    .createHmac('sha256', PROVIDER_SECRET)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest('hex');
}

export function createGatewayOrder(input: CreatePaymentOrderInput) {
  if (input.amount <= 0) {
    throw new AppError('Payment amount must be greater than zero.', 400);
  }

  const db = getDb();
  const now = new Date().toISOString();
  const providerOrderId = `order_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const paymentRecord: IPayment = {
    id: `pay_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: input.userId,
    providerOrderId,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency || 'INR',
    method: input.method,
    status: input.method === 'COD' ? 'Pending' : 'Authorized',
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  db.payments.push(paymentRecord);
  savePersistentStore();

  // In sandbox mode, also return a simulated providerPaymentId and test signature token
  // so the frontend sandbox checkout modal can complete a real cryptographic verification roundtrip.
  const sandboxPaymentId = `pay_sandbox_${Date.now()}`;
  const sandboxSignature = computePaymentSignature(providerOrderId, sandboxPaymentId);

  return {
    paymentRecordId: paymentRecord.id,
    providerKey: PROVIDER_KEY,
    providerOrderId,
    amount: paymentRecord.amount,
    currency: paymentRecord.currency,
    method: paymentRecord.method,
    sandboxCredentials: {
      providerPaymentId: sandboxPaymentId,
      signature: sandboxSignature,
    },
  };
}

export function verifyGatewayPayment(params: {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}): IPayment {
  const db = getDb();
  const payment = db.payments.find((p) => p.providerOrderId === params.providerOrderId);
  if (!payment) {
    throw new AppError('Payment order not found on server.', 404);
  }

  const expectedSignature = computePaymentSignature(params.providerOrderId, params.providerPaymentId);
  if (expectedSignature !== params.signature) {
    payment.status = 'Failed';
    payment.updatedAt = new Date().toISOString();
    savePersistentStore();
    throw new AppError('Payment signature verification failed. Untrusted payment payload.', 400);
  }

  payment.providerPaymentId = params.providerPaymentId;
  payment.signature = params.signature;
  payment.status = 'Paid';
  payment.updatedAt = new Date().toISOString();
  savePersistentStore();

  return payment;
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  return expected === signatureHeader;
}

export function initiateGatewayRefund(params: {
  orderId: string;
  providerOrderId?: string;
  amount: number;
  reason: string;
}): { refundId: string; status: PaymentStatus; amount: number; timestamp: string } {
  const db = getDb();
  const now = new Date().toISOString();
  const refundId = `rfnd_sandbox_${Date.now()}`;

  if (params.providerOrderId) {
    const payment = db.payments.find((p) => p.providerOrderId === params.providerOrderId);
    if (payment) {
      payment.status = 'Refunded';
      payment.refundId = refundId;
      payment.refundAmount = params.amount;
      payment.updatedAt = now;
      savePersistentStore();
    }
  }

  return {
    refundId,
    status: 'Refunded',
    amount: params.amount,
    timestamp: now,
  };
}
