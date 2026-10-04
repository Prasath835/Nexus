import { Request, Response } from 'express';
import { getDb, savePersistentStore } from '../config/db';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateAuthoritativePricing, validateCouponForAmount } from '../services/pricingService';
import { ICart, IWishlist } from '../models/schemas';

function getOrCreateUserCart(userId: string): ICart {
  const db = getDb();
  let cart = db.carts.find((c) => c.userId === userId);
  if (!cart) {
    cart = {
      id: `cart_${userId}`,
      userId,
      items: [],
      updatedAt: new Date().toISOString(),
    };
    db.carts.push(cart);
    savePersistentStore();
  }
  return cart;
}

function buildCartPayload(cart: ICart) {
  const db = getDb();
  const activeItems = cart.items.filter((i) => !i.savedForLater);
  const savedItems = cart.items.filter((i) => i.savedForLater);

  let pricing;
  try {
    pricing = calculateAuthoritativePricing({
      rawItems: activeItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      couponCode: cart.appliedCouponCode,
      strictStockCheck: false,
    });
  } catch (err) {
    // If applied coupon became invalid due to cart total dropping, clear coupon and recalculate
    cart.appliedCouponCode = undefined;
    pricing = calculateAuthoritativePricing({
      rawItems: activeItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      strictStockCheck: false,
    });
  }

  const enrichedActiveItems = activeItems.map((cartItem, idx) => ({
    cartItemId: cartItem.id,
    savedForLater: false,
    ...pricing.items[idx],
  }));

  const enrichedSavedItems = savedItems
    .map((cartItem) => {
      const product = db.products.find((p) => p.id === cartItem.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.id === cartItem.variantId) || product.variants[0];
      const variantParts = [variant?.color, variant?.size, variant?.capacity, variant?.finish].filter(Boolean);
      return {
        cartItemId: cartItem.id,
        savedForLater: true,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productImage: variant?.image || product.images[0]?.url || '',
        brand: product.brand,
        variantId: variant?.id || '',
        variantLabel: variantParts.join(' · ') || 'Standard Edition',
        sku: variant?.sku || product.sku,
        quantity: cartItem.quantity,
        unitPrice: variant ? variant.price : product.price,
        originalUnitPrice: variant ? variant.originalPrice : product.originalPrice,
        availableStock: variant ? variant.stock : product.stock,
      };
    })
    .filter(Boolean);

  return {
    cartId: cart.id,
    items: enrichedActiveItems,
    savedForLater: enrichedSavedItems,
    pricing: {
      subtotal: pricing.subtotal,
      productDiscount: pricing.productDiscount,
      discountedSubtotal: pricing.discountedSubtotal,
      couponCode: pricing.couponCode,
      couponDiscount: pricing.couponDiscount,
      couponMessage: pricing.couponMessage,
      deliveryFee: pricing.deliveryFee,
      taxRate: pricing.taxRate,
      taxAmount: pricing.taxAmount,
      finalTotal: pricing.finalTotal,
    },
  };
}

export function getCart(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const cart = getOrCreateUserCart(req.user.id);
  return sendSuccess(res, buildCartPayload(cart));
}

export function addToCart(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { productId, variantId, quantity = 1 } = req.body;
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));

  const db = getDb();
  const product = db.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found or unavailable.', 404);
  }

  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants[0];

  if (variantId && !variant) {
    return sendError(res, 'Selected product variant is invalid.', 400);
  }

  const maxStock = variant ? variant.stock : product.stock;
  if (maxStock <= 0) {
    return sendError(res, 'This item is currently out of stock.', 400);
  }

  const cart = getOrCreateUserCart(req.user.id);
  const resolvedVariantId = variant ? variant.id : '';
  const existing = cart.items.find(
    (i) => i.productId === product.id && i.variantId === resolvedVariantId && !i.savedForLater
  );

  if (existing) {
    const nextQty = existing.quantity + qty;
    if (nextQty > maxStock) {
      return sendError(res, `Cannot add more than available stock (${maxStock} units).`, 400);
    }
    existing.quantity = nextQty;
  } else {
    if (qty > maxStock) {
      return sendError(res, `Only ${maxStock} units available in stock.`, 400);
    }
    cart.items.push({
      id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      variantId: resolvedVariantId,
      quantity: qty,
      savedForLater: false,
      addedAt: new Date().toISOString(),
    });
  }

  cart.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, buildCartPayload(cart), `"${product.name}" added to your bag.`);
}

export function updateCartItemQuantity(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { itemId } = req.params;
  const { quantity } = req.body;
  const qty = Math.floor(Number(quantity));

  const cart = getOrCreateUserCart(req.user.id);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    return sendError(res, 'Cart item not found.', 404);
  }

  if (qty <= 0) {
    cart.items = cart.items.filter((i) => i.id !== itemId);
    cart.updatedAt = new Date().toISOString();
    savePersistentStore();
    return sendSuccess(res, buildCartPayload(cart), 'Item removed from bag.');
  }

  const db = getDb();
  const product = db.products.find((p) => p.id === item.productId);
  const variant = product?.variants.find((v) => v.id === item.variantId) || product?.variants[0];
  const maxStock = variant ? variant.stock : product?.stock || 0;

  if (qty > maxStock) {
    return sendError(res, `Maximum available stock is ${maxStock} units.`, 400);
  }

  item.quantity = qty;
  cart.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, buildCartPayload(cart), 'Quantity updated.');
}

export function toggleSaveForLater(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { itemId } = req.params;
  const cart = getOrCreateUserCart(req.user.id);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    return sendError(res, 'Cart item not found.', 404);
  }

  item.savedForLater = !item.savedForLater;
  cart.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(
    res,
    buildCartPayload(cart),
    item.savedForLater ? 'Item saved for later.' : 'Item moved back to active bag.'
  );
}

export function removeCartItem(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { itemId } = req.params;
  const cart = getOrCreateUserCart(req.user.id);
  cart.items = cart.items.filter((i) => i.id !== itemId);
  cart.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, buildCartPayload(cart), 'Item removed from bag.');
}

export function applyCartCoupon(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { code } = req.body;
  if (!code || String(code).trim() === '') {
    return sendError(res, 'Please enter a coupon code.', 400);
  }

  const cart = getOrCreateUserCart(req.user.id);
  const activeItems = cart.items.filter((i) => !i.savedForLater);
  if (activeItems.length === 0) {
    return sendError(res, 'Add items to your bag before applying a coupon.', 400);
  }

  try {
    const baseCalc = calculateAuthoritativePricing({
      rawItems: activeItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    });

    const { coupon } = validateCouponForAmount(String(code), baseCalc.discountedSubtotal);
    cart.appliedCouponCode = coupon.code;
    cart.updatedAt = new Date().toISOString();
    savePersistentStore();

    return sendSuccess(res, buildCartPayload(cart), `Coupon "${coupon.code}" applied.`);
  } catch (err: any) {
    return sendError(res, err.message || 'Invalid coupon code.', err.statusCode || 400);
  }
}

export function removeCartCoupon(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const cart = getOrCreateUserCart(req.user.id);
  cart.appliedCouponCode = undefined;
  cart.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, buildCartPayload(cart), 'Coupon removed.');
}

export function getActiveCoupons(_req: Request, res: Response) {
  const db = getDb();
  const now = Date.now();
  const coupons = db.coupons.filter(
    (c) => c.isActive && new Date(c.expiresAt).getTime() > now && c.usedCount < c.usageLimit
  );
  return sendSuccess(res, { coupons });
}

function getOrCreateWishlist(userId: string): IWishlist {
  const db = getDb();
  let wish = db.wishlists.find((w) => w.userId === userId);
  if (!wish) {
    wish = {
      id: `wish_${userId}`,
      userId,
      productIds: [],
      updatedAt: new Date().toISOString(),
    };
    db.wishlists.push(wish);
    savePersistentStore();
  }
  return wish;
}

export function getWishlist(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const db = getDb();
  const wish = getOrCreateWishlist(req.user.id);
  const products = wish.productIds
    .map((pid) => db.products.find((p) => p.id === pid && p.isActive))
    .filter(Boolean);

  return sendSuccess(res, { productIds: wish.productIds, products });
}

export function toggleWishlist(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { productId } = req.body;
  const db = getDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    return sendError(res, 'Product not found.', 404);
  }

  const wish = getOrCreateWishlist(req.user.id);
  const exists = wish.productIds.includes(productId);
  if (exists) {
    wish.productIds = wish.productIds.filter((id) => id !== productId);
  } else {
    wish.productIds.push(productId);
  }

  wish.updatedAt = new Date().toISOString();
  savePersistentStore();

  const products = wish.productIds
    .map((pid) => db.products.find((p) => p.id === pid && p.isActive))
    .filter(Boolean);

  return sendSuccess(
    res,
    { productIds: wish.productIds, products, added: !exists },
    exists ? 'Removed from wishlist.' : 'Saved to wishlist.'
  );
}

export function moveWishlistToCart(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { productId } = req.params;
  const db = getDb();
  const product = db.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product unavailable.', 404);
  }

  const wish = getOrCreateWishlist(req.user.id);
  wish.productIds = wish.productIds.filter((id) => id !== productId);

  const cart = getOrCreateUserCart(req.user.id);
  const variant = product.variants[0];
  const existing = cart.items.find(
    (i) => i.productId === product.id && i.variantId === (variant?.id || '') && !i.savedForLater
  );
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, variant ? variant.stock : product.stock);
  } else {
    cart.items.push({
      id: `ci_${Date.now()}`,
      productId: product.id,
      variantId: variant?.id || '',
      quantity: 1,
      savedForLater: false,
      addedAt: new Date().toISOString(),
    });
  }

  savePersistentStore();
  return sendSuccess(res, { cart: buildCartPayload(cart), wishlistProductIds: wish.productIds }, 'Moved to bag.');
}

export function calculateCheckoutSummary(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { buyNowItem, couponCode, deliveryMethod } = req.body;

  try {
    const cart = getOrCreateUserCart(req.user.id);
    const rawItems = buyNowItem
      ? [
          {
            productId: String(buyNowItem.productId),
            variantId: buyNowItem.variantId ? String(buyNowItem.variantId) : undefined,
            quantity: Number(buyNowItem.quantity) || 1,
          },
        ]
      : cart.items
          .filter((i) => !i.savedForLater)
          .map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          }));

    if (rawItems.length === 0) {
      return sendError(res, 'No items selected for checkout.', 400);
    }

    const effectiveCoupon = couponCode !== undefined ? couponCode : cart.appliedCouponCode;
    const summary = calculateAuthoritativePricing({
      rawItems,
      couponCode: effectiveCoupon,
      deliveryMethod: deliveryMethod === 'Express' ? 'Express' : 'Standard',
      strictStockCheck: true,
    });

    return sendSuccess(res, { summary });
  } catch (err: any) {
    return sendError(res, err.message || 'Checkout validation failed.', err.statusCode || 400);
  }
}
