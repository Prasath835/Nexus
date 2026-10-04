import { Response } from 'express';
import { getDb, savePersistentStore } from '../config/db';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAuthoritativePricing } from '../services/pricingService';
import {
  createGatewayOrder,
  verifyGatewayPayment,
  initiateGatewayRefund,
} from '../services/paymentService';
import { IOrder } from '../models/schemas';

export function initiatePaymentOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { buyNowItem, couponCode, deliveryMethod, paymentMethod } = req.body;

  try {
    const db = getDb();
    const cart = db.carts.find((c) => c.userId === req.user!.id);
    const rawItems = buyNowItem
      ? [
          {
            productId: String(buyNowItem.productId),
            variantId: buyNowItem.variantId ? String(buyNowItem.variantId) : undefined,
            quantity: Number(buyNowItem.quantity) || 1,
          },
        ]
      : (cart?.items || [])
          .filter((i) => !i.savedForLater)
          .map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          }));

    if (rawItems.length === 0) {
      return sendError(res, 'Cannot initiate payment for an empty order.', 400);
    }

    // Recalculate authoritative total on backend — never trust client amount
    const effectiveCoupon = couponCode !== undefined ? couponCode : cart?.appliedCouponCode;
    const pricing = calculateAuthoritativePricing({
      rawItems,
      couponCode: effectiveCoupon,
      deliveryMethod: deliveryMethod === 'Express' ? 'Express' : 'Standard',
      strictStockCheck: true,
    });

    const gatewayOrder = createGatewayOrder({
      userId: req.user.id,
      amount: pricing.finalTotal,
      currency: 'INR',
      method: paymentMethod || 'Card',
    });

    return sendSuccess(res, { gatewayOrder, pricing }, 'Payment order initialized on backend.', 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to initialize payment order.', err.statusCode || 400);
  }
}

export function verifyPaymentEndpoint(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { providerOrderId, providerPaymentId, signature } = req.body;

  if (!providerOrderId || !providerPaymentId || !signature) {
    return sendError(res, 'providerOrderId, providerPaymentId, and signature are required.', 400);
  }

  try {
    const payment = verifyGatewayPayment({
      providerOrderId: String(providerOrderId),
      providerPaymentId: String(providerPaymentId),
      signature: String(signature),
    });
    return sendSuccess(res, { payment }, 'Payment cryptographically verified.');
  } catch (err: any) {
    return sendError(res, err.message || 'Payment verification failed.', err.statusCode || 400);
  }
}

export function createOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const {
    addressId,
    shippingAddress,
    deliveryMethod,
    paymentMethod,
    providerOrderId,
    providerPaymentId,
    paymentSignature,
    buyNowItem,
    couponCode,
    idempotencyKey,
  } = req.body;

  const db = getDb();

  // Prevent duplicate order creation using idempotencyKey
  if (idempotencyKey) {
    const existingOrder = db.orders.find(
      (o) => o.userId === req.user!.id && o.idempotencyKey === String(idempotencyKey)
    );
    if (existingOrder) {
      return sendSuccess(res, { order: existingOrder }, 'Order already processed.');
    }
  }

  // Resolve shipping address
  let resolvedAddress = req.user.addresses.find((a) => a.id === addressId);
  if (!resolvedAddress && shippingAddress && shippingAddress.pincode) {
    resolvedAddress = {
      id: `addr_snap_${Date.now()}`,
      name: String(shippingAddress.name || req.user.name),
      phone: String(shippingAddress.phone || req.user.phone),
      house: String(shippingAddress.house || ''),
      street: String(shippingAddress.street || ''),
      area: String(shippingAddress.area || ''),
      city: String(shippingAddress.city || ''),
      state: String(shippingAddress.state || ''),
      pincode: String(shippingAddress.pincode || ''),
      type: shippingAddress.type || 'Home',
      isDefault: false,
    };
  }

  if (!resolvedAddress) {
    return sendError(res, 'A valid delivery address is required to place an order.', 400);
  }

  const cart = db.carts.find((c) => c.userId === req.user!.id);
  const rawItems = buyNowItem
    ? [
        {
          productId: String(buyNowItem.productId),
          variantId: buyNowItem.variantId ? String(buyNowItem.variantId) : undefined,
          quantity: Number(buyNowItem.quantity) || 1,
        },
      ]
    : (cart?.items || [])
        .filter((i) => !i.savedForLater)
        .map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        }));

  if (rawItems.length === 0) {
    return sendError(res, 'No items in bag to create an order.', 400);
  }

  try {
    const effectiveCoupon = couponCode !== undefined ? couponCode : cart?.appliedCouponCode;
    const pricing = calculateAuthoritativePricing({
      rawItems,
      couponCode: effectiveCoupon,
      deliveryMethod: deliveryMethod === 'Express' ? 'Express' : 'Standard',
      strictStockCheck: true,
    });

    // Verify online payment on backend before order creation
    const method: IOrder['paymentMethod'] =
      paymentMethod === 'UPI' ||
      paymentMethod === 'Card' ||
      paymentMethod === 'NetBanking' ||
      paymentMethod === 'Wallet'
        ? paymentMethod
        : 'COD';

    let paymentStatus: IOrder['paymentStatus'] = 'Pending';
    let verifiedPaymentId: string | undefined;

    if (method !== 'COD') {
      if (!providerOrderId || !providerPaymentId || !paymentSignature) {
        return sendError(
          res,
          'Online payment verification credentials are required before confirming this order.',
          400
        );
      }
      const verifiedPayment = verifyGatewayPayment({
        providerOrderId: String(providerOrderId),
        providerPaymentId: String(providerPaymentId),
        signature: String(paymentSignature),
      });
      paymentStatus = 'Paid';
      verifiedPaymentId = verifiedPayment.providerPaymentId;
    }

    // Deduct stock from products and variants
    for (const item of pricing.items) {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          variant.stock = Math.max(0, variant.stock - item.quantity);
          variant.isAvailable = variant.stock > 0;
          product.stock = product.variants.reduce((acc, v) => acc + v.stock, 0);
        } else {
          product.stock = Math.max(0, product.stock - item.quantity);
        }
      }
    }

    // Increment coupon usage count if applied
    if (pricing.couponCode) {
      const cpn = db.coupons.find((c) => c.code.toUpperCase() === pricing.couponCode!.toUpperCase());
      if (cpn) {
        cpn.usedCount += 1;
      }
    }

    const now = new Date().toISOString();
    const seq = 1000 + db.orders.length + 45;
    const orderNumber = `AG-2026-${seq}`;
    const invoiceNumber = `INV-${orderNumber}`;

    const newOrder: IOrder = {
      id: `ord_${Date.now()}`,
      orderNumber,
      invoiceNumber,
      userId: req.user.id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: resolvedAddress.phone || req.user.phone,
      items: pricing.items.map(({ availableStock, inStock, ...snap }) => snap),
      pricing: {
        subtotal: pricing.subtotal,
        productDiscount: pricing.productDiscount,
        couponCode: pricing.couponCode,
        couponDiscount: pricing.couponDiscount,
        deliveryMethod: pricing.deliveryMethod,
        deliveryFee: pricing.deliveryFee,
        taxRate: pricing.taxRate,
        taxAmount: pricing.taxAmount,
        finalTotal: pricing.finalTotal,
      },
      shippingAddress: resolvedAddress,
      paymentMethod: method,
      paymentStatus,
      paymentId: verifiedPaymentId,
      providerOrderId: providerOrderId ? String(providerOrderId) : undefined,
      orderStatus: method === 'COD' ? 'Confirmed' : 'Confirmed',
      timeline: [
        {
          status: 'Pending',
          note: 'Order submitted and inventory allocated.',
          timestamp: now,
          updatedBy: 'System',
        },
        {
          status: 'Confirmed',
          note:
            method === 'COD'
              ? 'Order confirmed under Cash on Delivery protocol.'
              : `Payment of ₹${pricing.finalTotal.toLocaleString('en-IN')} verified via ${method}.`,
          timestamp: now,
          updatedBy: method === 'COD' ? 'Order Engine' : 'Payment Gateway',
        },
      ],
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.orders.unshift(newOrder);

    // Clear active items from cart if not Buy Now
    if (!buyNowItem && cart) {
      cart.items = cart.items.filter((i) => i.savedForLater);
      cart.appliedCouponCode = undefined;
      cart.updatedAt = now;
    }

    db.notifications.unshift({
      id: `notif_${Date.now()}_cust`,
      userId: req.user.id,
      type: 'order',
      title: `Order ${orderNumber} Confirmed`,
      message: `Thank you for your order of ₹${pricing.finalTotal.toLocaleString('en-IN')}. We are preparing your shipment.`,
      link: `/orders/${newOrder.id}`,
      isRead: false,
      createdAt: now,
    });

    db.notifications.unshift({
      id: `notif_${Date.now()}_adm`,
      userId: 'admin',
      type: 'order',
      title: `New Order ${orderNumber}`,
      message: `${req.user.name} placed an order totaling ₹${pricing.finalTotal.toLocaleString('en-IN')}.`,
      link: `/admin/orders/${newOrder.id}`,
      isRead: false,
      createdAt: now,
    });

    savePersistentStore();
    return sendSuccess(res, { order: newOrder }, `Order ${orderNumber} confirmed.`, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Order creation failed.', err.statusCode || 400);
  }
}

export function getMyOrders(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const db = getDb();
  const orders = db.orders
    .filter((o) => o.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return sendSuccess(res, { orders });
}

export function getOrderDetails(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const db = getDb();
  const order = db.orders.find((o) => o.id === id || o.orderNumber === id);

  if (!order) {
    return sendError(res, 'Order not found.', 404);
  }

  // SECURITY RULE: Customer can only access their own orders
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return sendError(res, 'Forbidden: You do not have permission to view this order.', 403);
  }

  return sendSuccess(res, { order });
}

export function cancelCustomerOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const { reason } = req.body;

  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return sendError(res, 'Order not found.', 404);
  }

  if (order.userId !== req.user.id) {
    return sendError(res, 'Forbidden: You cannot modify another customer’s order.', 403);
  }

  const cancellableStatuses = ['Pending', 'Confirmed', 'Processing'];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    return sendError(
      res,
      `Order cannot be cancelled once it is in "${order.orderStatus}" status.`,
      400
    );
  }

  const now = new Date().toISOString();
  order.orderStatus = 'Cancelled';
  order.cancellationReason = String(reason || 'Cancelled by customer').trim();

  // Restore inventory stock
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (variant) {
        variant.stock += item.quantity;
        variant.isAvailable = true;
        product.stock = product.variants.reduce((acc, v) => acc + v.stock, 0);
      } else {
        product.stock += item.quantity;
      }
    }
  }

  order.timeline.push({
    status: 'Cancelled',
    note: `Order cancelled by customer. Reason: ${order.cancellationReason}`,
    timestamp: now,
    updatedBy: req.user.name,
  });

  // If already paid online, initiate automatic refund
  if (order.paymentStatus === 'Paid') {
    const refund = initiateGatewayRefund({
      orderId: order.id,
      providerOrderId: order.providerOrderId,
      amount: order.pricing.finalTotal,
      reason: order.cancellationReason,
    });
    order.paymentStatus = 'Refunded';
    order.refundDetails = {
      status: 'Processed',
      amount: order.pricing.finalTotal,
      reason: order.cancellationReason,
      providerReference: refund.refundId,
      initiatedAt: now,
      completedAt: now,
    };
    order.timeline.push({
      status: 'Refunded',
      note: `Full refund of ₹${order.pricing.finalTotal.toLocaleString('en-IN')} processed (Ref: ${refund.refundId}).`,
      timestamp: now,
      updatedBy: 'Payment Gateway',
    });
  }

  order.updatedAt = now;
  savePersistentStore();

  return sendSuccess(res, { order }, 'Order cancelled and stock restored.');
}

export function requestOrderReturn(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const { type, reason, description, images } = req.body;

  if (!reason || String(reason).trim().length < 3) {
    return sendError(res, 'Please select a reason for your return/replacement request.', 400);
  }

  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return sendError(res, 'Order not found.', 404);
  }

  if (order.userId !== req.user.id) {
    return sendError(res, 'Forbidden: You cannot modify another customer’s order.', 403);
  }

  if (order.orderStatus !== 'Delivered') {
    return sendError(res, 'Return or replacement can only be requested for delivered orders.', 400);
  }

  const now = new Date().toISOString();
  const reqType = type === 'Replacement' ? 'Replacement' : 'Return';
  order.orderStatus = 'Return Requested';
  order.returnRequest = {
    type: reqType,
    reason: String(reason).trim(),
    description: String(description || '').trim(),
    images: Array.isArray(images) ? images.map(String) : [],
    status: 'Requested',
    requestedAt: now,
  };

  order.timeline.push({
    status: 'Return Requested',
    note: `${reqType} requested by customer (${order.returnRequest.reason}).`,
    timestamp: now,
    updatedBy: req.user.name,
  });

  order.updatedAt = now;
  savePersistentStore();

  return sendSuccess(res, { order }, `${reqType} request submitted for review.`);
}

export function reorderItems(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const db = getDb();
  const order = db.orders.find((o) => o.id === id);

  if (!order || order.userId !== req.user.id) {
    return sendError(res, 'Order not found.', 404);
  }

  let cart = db.carts.find((c) => c.userId === req.user!.id);
  if (!cart) {
    cart = { id: `cart_${req.user.id}`, userId: req.user.id, items: [], updatedAt: new Date().toISOString() };
    db.carts.push(cart);
  }

  let addedCount = 0;
  for (const oldItem of order.items) {
    const product = db.products.find((p) => p.id === oldItem.productId && p.isActive);
    if (!product) continue;
    const variant = product.variants.find((v) => v.id === oldItem.variantId) || product.variants[0];
    const stock = variant ? variant.stock : product.stock;
    if (stock <= 0) continue;

    const existing = cart.items.find(
      (i) => i.productId === product.id && i.variantId === (variant?.id || '') && !i.savedForLater
    );
    if (existing) {
      existing.quantity = Math.min(stock, existing.quantity + oldItem.quantity);
    } else {
      cart.items.push({
        id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        variantId: variant?.id || '',
        quantity: Math.min(stock, oldItem.quantity),
        savedForLater: false,
        addedAt: new Date().toISOString(),
      });
    }
    addedCount++;
  }

  cart.updatedAt = new Date().toISOString();
  savePersistentStore();

  if (addedCount === 0) {
    return sendError(res, 'Items from this historical order are currently out of stock.', 400);
  }

  return sendSuccess(res, { addedCount }, `${addedCount} item(s) added to your bag at current live pricing.`);
}

export function getOrderInvoice(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const db = getDb();
  const order = db.orders.find((o) => o.id === id || o.orderNumber === id);

  if (!order) {
    return sendError(res, 'Order not found.', 404);
  }

  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return sendError(res, 'Forbidden', 403);
  }

  const invoice = {
    invoiceNumber: order.invoiceNumber,
    orderNumber: order.orderNumber,
    issuedDate: order.createdAt,
    seller: {
      legalName: 'Aethelgard Atelier Private Limited',
      gstin: '06AABCA9281K1Z8',
      address: 'Plot 19, Sector 32 Institutional Area, Gurugram, Haryana 122001, India',
      email: 'concierge@aethelgard.com',
    },
    buyer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      shippingAddress: order.shippingAddress,
    },
    items: order.items,
    pricing: order.pricing,
    payment: {
      method: order.paymentMethod,
      status: order.paymentStatus,
      reference: order.paymentId || order.providerOrderId || 'COD-SETTLEMENT',
    },
  };

  return sendSuccess(res, { invoice });
}

export function getNotifications(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const db = getDb();
  const targetId = req.user.role === 'admin' ? 'admin' : req.user.id;
  const notifications = db.notifications.filter((n) => n.userId === targetId || n.userId === req.user!.id);
  return sendSuccess(res, { notifications });
}

export function markNotificationsRead(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const db = getDb();
  const targetId = req.user.role === 'admin' ? 'admin' : req.user.id;
  db.notifications.forEach((n) => {
    if (n.userId === targetId || n.userId === req.user!.id) {
      n.isRead = true;
    }
  });
  savePersistentStore();
  return sendSuccess(res, {}, 'Notifications marked as read.');
}
