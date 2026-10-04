import { Request, Response } from 'express';
import { getDb, savePersistentStore } from '../config/db';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth';
import { checkPincodeDelivery } from '../services/pricingService';
import { IQuestion, IReview } from '../models/schemas';

export function getCategories(_req: Request, res: Response) {
  const db = getDb();
  const activeProducts = db.products.filter((p) => p.isActive);

  const enriched = db.categories
    .filter((c) => c.isActive)
    .map((cat) => {
      const catProducts = activeProducts.filter((p) => p.categorySlug === cat.slug || p.category === cat.name);
      const subcategoryCounts = cat.subcategories.map((sub) => ({
        name: sub,
        count: catProducts.filter((p) => p.subcategory === sub).length,
      }));
      return {
        ...cat,
        productCount: catProducts.length,
        subcategoryCounts,
      };
    });

  return sendSuccess(res, { categories: enriched });
}

export function getCategoryBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const db = getDb();
  const category = db.categories.find((c) => c.slug === slug && c.isActive);
  if (!category) {
    return sendError(res, 'Category not found.', 404);
  }

  const products = db.products.filter(
    (p) => p.isActive && (p.categorySlug === category.slug || p.category === category.name)
  );

  return sendSuccess(res, { category, products, totalCount: products.length });
}

export function getProducts(req: Request, res: Response) {
  const db = getDb();
  const {
    q,
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    material,
    featured,
    trending,
    newArrival,
    deals,
    sort = 'relevance',
    page = '1',
    limit = '12',
  } = req.query;

  let filtered = db.products.filter((p) => p.isActive);

  if (q && String(q).trim() !== '') {
    const query = String(q).trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.shortDescription.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.subcategory.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
    );
  }

  if (category && String(category) !== 'all') {
    const catFilter = String(category).toLowerCase();
    filtered = filtered.filter(
      (p) => p.categorySlug.toLowerCase() === catFilter || p.category.toLowerCase() === catFilter
    );
  }

  if (subcategory && String(subcategory) !== 'all') {
    filtered = filtered.filter((p) => p.subcategory.toLowerCase() === String(subcategory).toLowerCase());
  }

  if (brand && String(brand) !== 'all') {
    filtered = filtered.filter((p) => p.brand.toLowerCase() === String(brand).toLowerCase());
  }

  if (material && String(material) !== 'all') {
    filtered = filtered.filter((p) =>
      p.attributes.material?.toLowerCase().includes(String(material).toLowerCase())
    );
  }

  if (minPrice !== undefined && String(minPrice) !== '') {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) filtered = filtered.filter((p) => p.price >= min);
  }

  if (maxPrice !== undefined && String(maxPrice) !== '') {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) filtered = filtered.filter((p) => p.price <= max);
  }

  if (minRating !== undefined && String(minRating) !== '') {
    const rating = Number(minRating);
    if (!Number.isNaN(rating)) filtered = filtered.filter((p) => p.ratingSummary.average >= rating);
  }

  if (inStock === 'true') {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  if (featured === 'true') filtered = filtered.filter((p) => p.isFeatured);
  if (trending === 'true') filtered = filtered.filter((p) => p.isTrending);
  if (newArrival === 'true') filtered = filtered.filter((p) => p.isNewArrival);
  if (deals === 'true') filtered = filtered.filter((p) => p.isDeal);

  const sortKey = String(sort);
  if (sortKey === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortKey === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortKey === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortKey === 'rating') {
    filtered.sort((a, b) => b.ratingSummary.average - a.ratingSummary.average);
  } else if (sortKey === 'popularity') {
    filtered.sort((a, b) => b.ratingSummary.count - a.ratingSummary.count);
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 12));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const allBrands = Array.from(new Set(db.products.filter((p) => p.isActive).map((p) => p.brand)));
  const allMaterials = Array.from(
    new Set(
      db.products
        .filter((p) => p.isActive && p.attributes.material)
        .map((p) => p.attributes.material as string)
    )
  );

  return sendSuccess(res, {
    products: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
    facets: {
      brands: allBrands,
      materials: allMaterials,
    },
  });
}

export function getSearchSuggestions(req: Request, res: Response) {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    return sendSuccess(res, { suggestions: [] });
  }

  const db = getDb();
  const matches = db.products
    .filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q))
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      brand: p.brand,
      price: p.price,
      image: p.images[0]?.url || '',
    }));

  return sendSuccess(res, { suggestions: matches });
}

export function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const db = getDb();
  const product = db.products.find((p) => (p.slug === slug || p.id === slug) && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found.', 404);
  }

  const reviews = db.reviews
    .filter((r) => r.productId === product.id && !r.isHidden)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const questions = db.questions
    .filter((q) => q.productId === product.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const relatedProducts = db.products
    .filter((p) => p.isActive && p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, 3);

  return sendSuccess(res, {
    product,
    reviews,
    questions,
    relatedProducts,
  });
}

export function checkDeliveryAvailability(req: Request, res: Response) {
  try {
    const pincode = String(req.query.pincode || req.body.pincode || '');
    const result = checkPincodeDelivery(pincode);
    return sendSuccess(res, result, result.message);
  } catch (err: any) {
    return sendError(res, err.message || 'Invalid pincode', err.statusCode || 400);
  }
}

export function compareProducts(req: Request, res: Response) {
  const idsParam = String(req.query.ids || '');
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length > 4) {
    return sendError(res, 'Maximum 4 products can be compared simultaneously.', 400);
  }

  const db = getDb();
  const products = ids
    .map((id) => db.products.find((p) => (p.id === id || p.slug === id) && p.isActive))
    .filter(Boolean);

  return sendSuccess(res, { products });
}

function recalculateProductRating(productId: string) {
  const db = getDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) return;

  const activeReviews = db.reviews.filter((r) => r.productId === productId && !r.isHidden);
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (activeReviews.length === 0) {
    product.ratingSummary = { average: 0, count: 0, distribution };
    return;
  }

  let sum = 0;
  for (const r of activeReviews) {
    sum += r.rating;
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }

  product.ratingSummary = {
    average: Math.round((sum / activeReviews.length) * 10) / 10,
    count: activeReviews.length,
    distribution,
  };
}

export function createReview(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { productId, rating, title, comment, photos } = req.body;

  const numRating = Number(rating);
  if (!productId || Number.isNaN(numRating) || numRating < 1 || numRating > 5) {
    return sendError(res, 'Product ID and a rating between 1 and 5 stars are required.', 400);
  }

  if (!comment || String(comment).trim().length < 10) {
    return sendError(res, 'Written review must be at least 10 characters.', 400);
  }

  const db = getDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    return sendError(res, 'Product not found.', 404);
  }

  const existing = db.reviews.find((r) => r.productId === productId && r.userId === req.user!.id);
  if (existing) {
    return sendError(res, 'You have already reviewed this product. You can edit your existing review.', 409);
  }

  // MANDATORY BUSINESS LOGIC RULE:
  // Backend determines whether the user actually purchased and received the product.
  // Never trust client "verifiedPurchase" boolean.
  const hasPurchasedAndReceived = db.orders.some(
    (ord) =>
      ord.userId === req.user!.id &&
      ['Delivered', 'Return Requested', 'Returned'].includes(ord.orderStatus) &&
      ord.items.some((item) => item.productId === productId)
  );

  const now = new Date().toISOString();
  const newReview: IReview = {
    id: `rev_${Date.now()}`,
    productId,
    userId: req.user.id,
    userName: req.user.name,
    rating: Math.round(numRating),
    title: String(title || 'Customer Review').trim(),
    comment: String(comment).trim(),
    photos: Array.isArray(photos) ? photos.map(String) : [],
    verifiedPurchase: hasPurchasedAndReceived,
    createdAt: now,
    updatedAt: now,
  };

  db.reviews.unshift(newReview);
  recalculateProductRating(productId);
  savePersistentStore();

  return sendSuccess(res, { review: newReview, ratingSummary: product.ratingSummary }, 'Review published.', 201);
}

export function updateReview(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const db = getDb();
  const review = db.reviews.find((r) => r.id === id);

  if (!review) {
    return sendError(res, 'Review not found.', 404);
  }

  if (review.userId !== req.user.id && req.user.role !== 'admin') {
    return sendError(res, 'You are not authorized to edit this review.', 403);
  }

  const { rating, title, comment } = req.body;
  if (rating !== undefined) {
    const num = Number(rating);
    if (num >= 1 && num <= 5) review.rating = Math.round(num);
  }
  if (title !== undefined) review.title = String(title).trim();
  if (comment !== undefined) review.comment = String(comment).trim();
  review.updatedAt = new Date().toISOString();

  recalculateProductRating(review.productId);
  savePersistentStore();

  return sendSuccess(res, { review }, 'Review updated.');
}

export function deleteReview(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const db = getDb();
  const idx = db.reviews.findIndex((r) => r.id === id);

  if (idx === -1) {
    return sendError(res, 'Review not found.', 404);
  }

  const review = db.reviews[idx];
  if (review.userId !== req.user.id && req.user.role !== 'admin') {
    return sendError(res, 'You are not authorized to delete this review.', 403);
  }

  db.reviews.splice(idx, 1);
  recalculateProductRating(review.productId);
  savePersistentStore();

  return sendSuccess(res, {}, 'Review deleted.');
}

export function askQuestion(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { productId, question } = req.body;

  if (!productId || !question || String(question).trim().length < 5) {
    return sendError(res, 'Please enter a valid question (minimum 5 characters).', 400);
  }

  const db = getDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    return sendError(res, 'Product not found.', 404);
  }

  const newQuestion: IQuestion = {
    id: `q_${Date.now()}`,
    productId: product.id,
    productName: product.name,
    userId: req.user.id,
    userName: req.user.name,
    question: String(question).trim(),
    createdAt: new Date().toISOString(),
  };

  db.questions.unshift(newQuestion);
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: 'admin',
    type: 'operational',
    title: 'New Product Question Submitted',
    message: `${req.user.name} asked a question on ${product.name}.`,
    link: '/admin/questions',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  savePersistentStore();

  return sendSuccess(res, { question: newQuestion }, 'Your question has been submitted to our specialists.', 201);
}
