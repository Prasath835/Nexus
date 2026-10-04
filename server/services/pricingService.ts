import { getDb } from '../config/db';
import { ICoupon, IOrderItemSnapshot } from '../models/schemas';
import { AppError } from '../utils/apiResponse';

export interface PricedLineItem extends IOrderItemSnapshot {
  availableStock: number;
  inStock: boolean;
}

export interface CheckoutCalculationResult {
  items: PricedLineItem[];
  subtotal: number;
  productDiscount: number;
  discountedSubtotal: number;
  couponCode?: string;
  couponDiscount: number;
  couponMessage?: string;
  deliveryMethod: 'Standard' | 'Express';
  deliveryFee: number;
  taxRate: number;
  taxAmount: number;
  finalTotal: number;
}

export function validateCouponForAmount(
  couponCode: string,
  discountedSubtotal: number
): { coupon: ICoupon; discountAmount: number } {
  const db = getDb();
  const normalized = couponCode.trim().toUpperCase();
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized);

  if (!coupon) {
    throw new AppError(`Coupon code "${normalized}" is invalid.`, 400);
  }

  if (!coupon.isActive) {
    throw new AppError(`Coupon code "${normalized}" is currently disabled.`, 400);
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw new AppError(`Coupon code "${normalized}" has expired.`, 400);
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(`Coupon code "${normalized}" has reached its maximum usage limit.`, 400);
  }

  if (discountedSubtotal < coupon.minPurchase) {
    throw new AppError(
      `Coupon "${normalized}" requires a minimum purchase of ₹${coupon.minPurchase.toLocaleString('en-IN')}.`,
      400
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((discountedSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountValue;
    if (coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  }

  discountAmount = Math.min(discountAmount, discountedSubtotal);
  return { coupon, discountAmount };
}

export function calculateAuthoritativePricing(params: {
  rawItems: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
  deliveryMethod?: 'Standard' | 'Express';
  strictStockCheck?: boolean;
}): CheckoutCalculationResult {
  const db = getDb();
  const deliveryMethod = params.deliveryMethod === 'Express' ? 'Express' : 'Standard';
  const strictStock = params.strictStockCheck ?? false;

  if (!params.rawItems || params.rawItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      productDiscount: 0,
      discountedSubtotal: 0,
      couponDiscount: 0,
      deliveryMethod,
      deliveryFee: 0,
      taxRate: 18,
      taxAmount: 0,
      finalTotal: 0,
    };
  }

  const pricedItems: PricedLineItem[] = [];
  let subtotal = 0;
  let productDiscount = 0;

  for (const raw of params.rawItems) {
    const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
    const product = db.products.find((p) => p.id === raw.productId && p.isActive);
    if (!product) {
      throw new AppError(`Product (${raw.productId}) is no longer available.`, 404);
    }

    let variant = product.variants[0];
    if (raw.variantId) {
      const matched = product.variants.find((v) => v.id === raw.variantId);
      if (!matched) {
        throw new AppError(`Selected variant for "${product.name}" is invalid.`, 400);
      }
      variant = matched;
    }

    const availableStock = variant ? variant.stock : product.stock;
    const isAvailable = variant ? variant.isAvailable && availableStock > 0 : availableStock > 0;

    if (strictStock) {
      if (!isAvailable || availableStock < quantity) {
        throw new AppError(
          `Insufficient stock for "${product.name}" (${variant ? variant.sku : product.sku}). Only ${availableStock} left.`,
          400
        );
      }
    }

    const unitPrice = variant ? variant.price : product.price;
    const originalUnitPrice = variant ? variant.originalPrice : product.originalPrice;
    const lineSubtotal = originalUnitPrice * quantity;
    const lineTotal = unitPrice * quantity;
    const lineDiscount = Math.max(0, lineSubtotal - lineTotal);

    subtotal += lineSubtotal;
    productDiscount += lineDiscount;

    const variantParts = [variant?.color, variant?.size, variant?.capacity, variant?.finish].filter(Boolean);
    const mainImage = product.images.find((img) => img.isMain)?.url || product.images[0]?.url || '';

    pricedItems.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: variant?.image || mainImage,
      brand: product.brand,
      variantId: variant ? variant.id : '',
      variantLabel: variantParts.join(' · ') || 'Standard Edition',
      sku: variant ? variant.sku : product.sku,
      quantity,
      unitPrice,
      originalUnitPrice,
      lineSubtotal,
      lineDiscount,
      lineTotal,
      availableStock,
      inStock: isAvailable && availableStock >= quantity,
    });
  }

  const discountedSubtotal = Math.max(0, subtotal - productDiscount);

  let couponDiscount = 0;
  let appliedCouponCode: string | undefined;
  let couponMessage: string | undefined;

  if (params.couponCode && params.couponCode.trim() !== '') {
    const { coupon, discountAmount } = validateCouponForAmount(params.couponCode, discountedSubtotal);
    couponDiscount = discountAmount;
    appliedCouponCode = coupon.code;
    couponMessage = `${coupon.code} applied (Saved ₹${discountAmount.toLocaleString('en-IN')})`;
  }

  const taxableBase = Math.max(0, discountedSubtotal - couponDiscount);
  const taxRate = 18; // 18% GST calculated on backend
  const taxAmount = Math.round(taxableBase * (taxRate / 100) * 100) / 100;

  let deliveryFee = 0;
  if (deliveryMethod === 'Express') {
    deliveryFee = 950;
  } else {
    deliveryFee = taxableBase >= 50000 ? 0 : 450;
  }

  const finalTotal = Math.round((taxableBase + taxAmount + deliveryFee) * 100) / 100;

  return {
    items: pricedItems,
    subtotal,
    productDiscount,
    discountedSubtotal,
    couponCode: appliedCouponCode,
    couponDiscount,
    couponMessage,
    deliveryMethod,
    deliveryFee,
    taxRate,
    taxAmount,
    finalTotal,
  };
}

export function checkPincodeDelivery(pincode: string) {
  const clean = (pincode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(clean)) {
    throw new AppError('Please enter a valid 6-digit Indian postal pincode.', 400);
  }

  const prefix = parseInt(clean.substring(0, 2), 10);
  const metroPrefixes = [11, 12, 20, 40, 41, 50, 56, 60, 70, 38];
  const isMetro = metroPrefixes.includes(prefix);

  const estimatedDays = isMetro ? 2 : 4;
  const estimatedDate = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return {
    pincode: clean,
    serviceable: true,
    isMetro,
    estimatedDays,
    estimatedDeliveryDate: estimatedDate,
    codAvailable: true,
    expressAvailable: isMetro,
    message: isMetro
      ? `White-glove priority delivery by ${estimatedDate}`
      : `Insured air courier delivery by ${estimatedDate}`,
  };
}
