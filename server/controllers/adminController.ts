import { Response } from 'express';
import { getDb, savePersistentStore } from '../config/db';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth';
import { uploadProductMedia, deleteProductMedia } from '../services/cloudinaryService';
import { initiateGatewayRefund } from '../services/paymentService';
import { ICoupon, IProduct, OrderStatus } from '../models/schemas';

export function getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
  const db = getDb();
  const customers = db.users.filter((u) => u.role === 'customer');
  const totalCustomers = customers.length;
  const totalProducts = db.products.length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((o) =>
    ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery'].includes(o.orderStatus)
  ).length;
  const deliveredOrders = db.orders.filter((o) => o.orderStatus === 'Delivered').length;

  const totalRevenue = db.orders
    .filter((o) => !['Cancelled', 'Refunded'].includes(o.orderStatus))
    .reduce((sum, o) => sum + o.pricing.finalTotal, 0);

  const lowStockProducts = db.products.filter((p) => p.stock <= 5 || p.variants.some((v) => v.stock <= 2));
  const recentOrders = [...db.orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return sendSuccess(res, {
    metrics: {
      totalCustomers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      lowStockCount: lowStockProducts.length,
    },
    lowStockProducts,
    recentOrders,
  });
}

export function getAdminProducts(_req: AuthenticatedRequest, res: Response) {
  const db = getDb();
  return sendSuccess(res, { products: db.products, categories: db.categories });
}

export async function createAdminProduct(req: AuthenticatedRequest, res: Response) {
  const {
    name,
    shortDescription,
    description,
    category,
    subcategory,
    brand,
    sku,
    price,
    originalPrice,
    stock,
    images,
    variants,
    specifications,
    attributes,
    isFeatured,
    isTrending,
    isNewArrival,
    isDeal,
  } = req.body;

  if (!name || !category || !brand || !sku || price === undefined) {
    return sendError(res, 'Name, category, brand, SKU, and price are required.', 400);
  }

  const db = getDb();
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (db.products.some((p) => p.slug === slug || p.sku.toLowerCase() === String(sku).toLowerCase())) {
    return sendError(res, 'A product with this name/slug or SKU already exists.', 409);
  }

  const matchedCat = db.categories.find(
    (c) => c.name.toLowerCase() === String(category).toLowerCase() || c.slug === category
  );
  const categoryName = matchedCat ? matchedCat.name : String(category);
  const categorySlug = matchedCat
    ? matchedCat.slug
    : String(category)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

  const uploadedImages = [];
  if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const url = typeof img === 'string' ? img : img.url;
      if (url) {
        const uploaded = await uploadProductMedia(url, String(name), i === 0);
        uploadedImages.push(uploaded);
      }
    }
  } else {
    uploadedImages.push({
      url: '/src/assets/images/product_chronograph_watch_1791099646368.jpg',
      publicId: `aethelgard/products/default_${Date.now()}`,
      alt: String(name),
      isMain: true,
    });
  }

  const numPrice = Math.max(0, Number(price) || 0);
  const numOrig = Math.max(numPrice, Number(originalPrice) || numPrice);
  const discountPercent = numOrig > 0 ? Math.round(((numOrig - numPrice) / numOrig) * 100) : 0;

  const parsedVariants =
    Array.isArray(variants) && variants.length > 0
      ? variants.map((v: any, idx: number) => ({
          id: v.id || `var_${Date.now()}_${idx}`,
          sku: String(v.sku || `${sku}-V${idx + 1}`),
          size: v.size ? String(v.size) : undefined,
          color: v.color ? String(v.color) : undefined,
          capacity: v.capacity ? String(v.capacity) : undefined,
          finish: v.finish ? String(v.finish) : undefined,
          price: Number(v.price) || numPrice,
          originalPrice: Number(v.originalPrice) || numOrig,
          stock: Math.max(0, Number(v.stock) ?? 10),
          isAvailable: (Number(v.stock) ?? 10) > 0,
        }))
      : [
          {
            id: `var_${Date.now()}_0`,
            sku: `${String(sku)}-STD`,
            color: 'Standard Finish',
            price: numPrice,
            originalPrice: numOrig,
            stock: Math.max(0, Number(stock) || 10),
            isAvailable: (Number(stock) || 10) > 0,
          },
        ];

  const totalStock = parsedVariants.reduce((sum: number, v: any) => sum + v.stock, 0);
  const now = new Date().toISOString();

  const newProduct: IProduct = {
    id: `prod_${Date.now()}`,
    name: String(name).trim(),
    slug,
    shortDescription: String(shortDescription || description || name).trim(),
    description: String(description || shortDescription || name).trim(),
    category: categoryName,
    categorySlug,
    subcategory: String(subcategory || matchedCat?.subcategories[0] || 'General'),
    brand: String(brand).trim(),
    sku: String(sku).trim().toUpperCase(),
    price: numPrice,
    originalPrice: numOrig,
    discountPercent,
    stock: totalStock,
    images: uploadedImages,
    variants: parsedVariants,
    specifications: specifications && typeof specifications === 'object' ? specifications : {},
    attributes: attributes && typeof attributes === 'object' ? attributes : {},
    ratingSummary: {
      average: 0,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    isFeatured: Boolean(isFeatured),
    isTrending: Boolean(isTrending),
    isNewArrival: Boolean(isNewArrival ?? true),
    isDeal: Boolean(isDeal),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.products.unshift(newProduct);
  savePersistentStore();

  return sendSuccess(res, { product: newProduct }, 'Product created.', 201);
}

export async function updateAdminProduct(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const db = getDb();
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    return sendError(res, 'Product not found.', 404);
  }

  const {
    name,
    shortDescription,
    description,
    category,
    subcategory,
    brand,
    sku,
    price,
    originalPrice,
    stock,
    images,
    variants,
    specifications,
    attributes,
    isFeatured,
    isTrending,
    isNewArrival,
    isDeal,
    isActive,
  } = req.body;

  if (name) product.name = String(name).trim();
  if (shortDescription !== undefined) product.shortDescription = String(shortDescription).trim();
  if (description !== undefined) product.description = String(description).trim();
  if (category) {
    const matchedCat = db.categories.find(
      (c) => c.name.toLowerCase() === String(category).toLowerCase() || c.slug === category
    );
    product.category = matchedCat ? matchedCat.name : String(category);
    product.categorySlug = matchedCat
      ? matchedCat.slug
      : String(category)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
  }
  if (subcategory) product.subcategory = String(subcategory);
  if (brand) product.brand = String(brand).trim();
  if (sku) product.sku = String(sku).trim().toUpperCase();

  if (price !== undefined) product.price = Math.max(0, Number(price));
  if (originalPrice !== undefined) product.originalPrice = Math.max(product.price, Number(originalPrice));
  product.discountPercent =
    product.originalPrice > 0
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  if (Array.isArray(variants) && variants.length > 0) {
    product.variants = variants.map((v: any, idx: number) => ({
      id: v.id || `var_${Date.now()}_${idx}`,
      sku: String(v.sku || `${product.sku}-V${idx + 1}`),
      size: v.size ? String(v.size) : undefined,
      color: v.color ? String(v.color) : undefined,
      capacity: v.capacity ? String(v.capacity) : undefined,
      finish: v.finish ? String(v.finish) : undefined,
      price: Number(v.price) || product.price,
      originalPrice: Number(v.originalPrice) || product.originalPrice,
      stock: Math.max(0, Number(v.stock) ?? 0),
      isAvailable: (Number(v.stock) ?? 0) > 0,
    }));
    product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  } else if (stock !== undefined) {
    product.stock = Math.max(0, Number(stock));
    if (product.variants[0]) {
      product.variants[0].stock = product.stock;
      product.variants[0].price = product.price;
      product.variants[0].originalPrice = product.originalPrice;
    }
  }

  if (Array.isArray(images) && images.length > 0) {
    const updatedImgs = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (typeof img === 'string') {
        updatedImgs.push(await uploadProductMedia(img, product.name, i === 0));
      } else if (img && img.url) {
        updatedImgs.push({
          url: img.url,
          publicId: img.publicId || `aethelgard/products/img_${Date.now()}_${i}`,
          alt: img.alt || product.name,
          isMain: i === 0,
        });
      }
    }
    if (updatedImgs.length > 0) product.images = updatedImgs;
  }

  if (specifications && typeof specifications === 'object') product.specifications = specifications;
  if (attributes && typeof attributes === 'object') product.attributes = attributes;
  if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
  if (isTrending !== undefined) product.isTrending = Boolean(isTrending);
  if (isNewArrival !== undefined) product.isNewArrival = Boolean(isNewArrival);
  if (isDeal !== undefined) product.isDeal = Boolean(isDeal);
  if (isActive !== undefined) product.isActive = Boolean(isActive);

  product.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { product }, 'Product updated.');
}

export async function deleteAdminProduct(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const db = getDb();
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return sendError(res, 'Product not found.', 404);
  }

  const product = db.products[idx];
  for (const img of product.images) {
    if (img.publicId) {
      await deleteProductMedia(img.publicId);
    }
  }

  db.products.splice(idx, 1);
  savePersistentStore();

  return sendSuccess(res, {}, 'Product and associated Cloudinary media references deleted.');
}

export function getAdminCustomers(req: AuthenticatedRequest, res: Response) {
  const q = String(req.query.q || '').trim().toLowerCase();
  const db = getDb();

  let customers = db.users
    .filter((u) => u.role === 'customer')
    .map((u) => {
      const userOrders = db.orders.filter((o) => o.userId === u.id);
      const totalSpent = userOrders
        .filter((o) => !['Cancelled', 'Refunded'].includes(o.orderStatus))
        .reduce((acc, o) => acc + o.pricing.finalTotal, 0);
      const { passwordHash, otpCode, resetToken, ...safe } = u;
      return {
        ...safe,
        orderCount: userOrders.length,
        totalSpent,
        orders: userOrders,
      };
    });

  if (q) {
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }

  return sendSuccess(res, { customers });
}

export function toggleCustomerActiveState(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const db = getDb();
  const user = db.users.find((u) => u.id === id && u.role === 'customer');
  if (!user) {
    return sendError(res, 'Customer not found.', 404);
  }

  user.isActive = !user.isActive;
  user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(
    res,
    { isActive: user.isActive },
    `Customer account ${user.isActive ? 'activated' : 'deactivated'}.`
  );
}

export function getAdminOrders(req: AuthenticatedRequest, res: Response) {
  const { status, q } = req.query;
  const db = getDb();
  let orders = [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (status && String(status) !== 'All') {
    orders = orders.filter((o) => o.orderStatus === String(status));
  }

  if (q && String(q).trim() !== '') {
    const query = String(q).trim().toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.customerEmail.toLowerCase().includes(query)
    );
  }

  return sendSuccess(res, { orders });
}

export function updateAdminOrderStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status, note } = req.body;
  const db = getDb();
  const order = db.orders.find((o) => o.id === id || o.orderNumber === id);

  if (!order) {
    return sendError(res, 'Order not found.', 404);
  }

  const validStatuses: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Return Requested',
    'Returned',
    'Refund Initiated',
    'Refunded',
  ];

  if (!validStatuses.includes(status)) {
    return sendError(res, 'Invalid order status.', 400);
  }

  const now = new Date().toISOString();
  order.orderStatus = status;

  if (status === 'Delivered' && order.paymentMethod === 'COD') {
    order.paymentStatus = 'Paid';
  }

  if (status === 'Returned' && order.returnRequest) {
    order.returnRequest.status = 'Completed';
    order.returnRequest.resolvedAt = now;
  }

  if (status === 'Refunded') {
    const refund = initiateGatewayRefund({
      orderId: order.id,
      providerOrderId: order.providerOrderId,
      amount: order.pricing.finalTotal,
      reason: note || 'Admin processed refund',
    });
    order.paymentStatus = 'Refunded';
    order.refundDetails = {
      status: 'Processed',
      amount: order.pricing.finalTotal,
      reason: String(note || 'Refund approved by administrator'),
      providerReference: refund.refundId,
      initiatedAt: now,
      completedAt: now,
    };
  }

  order.timeline.push({
    status,
    note: String(note || `Order status updated to ${status} by administrator.`),
    timestamp: now,
    updatedBy: req.user?.name || 'Administrator',
  });

  order.updatedAt = now;

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: order.userId,
    type: 'order',
    title: `Order ${order.orderNumber}: ${status}`,
    message: String(note || `Your order status has been updated to ${status}.`),
    link: `/orders/${order.id}`,
    isRead: false,
    createdAt: now,
  });

  savePersistentStore();
  return sendSuccess(res, { order }, `Order status updated to ${status}.`);
}

export function getAdminCoupons(_req: AuthenticatedRequest, res: Response) {
  const db = getDb();
  return sendSuccess(res, { coupons: db.coupons });
}

export function createAdminCoupon(req: AuthenticatedRequest, res: Response) {
  const { code, description, discountType, discountValue, minPurchase, maxDiscount, usageLimit, expiresAt } =
    req.body;

  if (!code || !discountValue || !expiresAt) {
    return sendError(res, 'Coupon code, discount value, and expiration date are required.', 400);
  }

  const db = getDb();
  const normalizedCode = String(code).trim().toUpperCase();
  if (db.coupons.some((c) => c.code.toUpperCase() === normalizedCode)) {
    return sendError(res, 'Coupon code already exists.', 409);
  }

  const newCoupon: ICoupon = {
    id: `cpn_${Date.now()}`,
    code: normalizedCode,
    description: String(description || `${normalizedCode} promotional offer`),
    discountType: discountType === 'flat' ? 'flat' : 'percentage',
    discountValue: Math.max(1, Number(discountValue)),
    minPurchase: Math.max(0, Number(minPurchase) || 0),
    maxDiscount: Math.max(0, Number(maxDiscount) || 0),
    usageLimit: Math.max(1, Number(usageLimit) || 100),
    usedCount: 0,
    expiresAt: new Date(expiresAt).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.coupons.unshift(newCoupon);
  savePersistentStore();

  return sendSuccess(res, { coupon: newCoupon }, 'Coupon created.', 201);
}

export function updateAdminCoupon(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const db = getDb();
  const coupon = db.coupons.find((c) => c.id === id);
  if (!coupon) {
    return sendError(res, 'Coupon not found.', 404);
  }

  const { description, discountType, discountValue, minPurchase, maxDiscount, usageLimit, expiresAt, isActive } =
    req.body;

  if (description !== undefined) coupon.description = String(description);
  if (discountType === 'flat' || discountType === 'percentage') coupon.discountType = discountType;
  if (discountValue !== undefined) coupon.discountValue = Math.max(1, Number(discountValue));
  if (minPurchase !== undefined) coupon.minPurchase = Math.max(0, Number(minPurchase));
  if (maxDiscount !== undefined) coupon.maxDiscount = Math.max(0, Number(maxDiscount));
  if (usageLimit !== undefined) coupon.usageLimit = Math.max(1, Number(usageLimit));
  if (expiresAt) coupon.expiresAt = new Date(expiresAt).toISOString();
  if (isActive !== undefined) coupon.isActive = Boolean(isActive);

  savePersistentStore();
  return sendSuccess(res, { coupon }, 'Coupon updated.');
}

export function getAdminReviews(_req: AuthenticatedRequest, res: Response) {
  const db = getDb();
  const enriched = db.reviews.map((r) => {
    const product = db.products.find((p) => p.id === r.productId);
    return {
      ...r,
      productName: product?.name || 'Product',
      productSlug: product?.slug || '',
    };
  });
  return sendSuccess(res, { reviews: enriched });
}

export function getAdminQuestions(_req: AuthenticatedRequest, res: Response) {
  const db = getDb();
  return sendSuccess(res, { questions: db.questions });
}

export function answerCustomerQuestion(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { answer } = req.body;
  if (!answer || String(answer).trim().length < 2) {
    return sendError(res, 'Please provide an answer.', 400);
  }

  const db = getDb();
  const question = db.questions.find((q) => q.id === id);
  if (!question) {
    return sendError(res, 'Question not found.', 404);
  }

  question.answer = String(answer).trim();
  question.answeredBy = `${req.user?.name || 'Admin'} — Specialist`;
  question.answeredAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { question }, 'Answer published.');
}
