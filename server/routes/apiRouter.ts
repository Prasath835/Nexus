import { Router } from 'express';
import { getConnectionStatus } from '../config/db';
import { sendSuccess } from '../utils/apiResponse';
import { requireAuth, requireAdmin, authRateLimiter, otpRateLimiter } from '../middleware/auth';
import {
  registerUser,
  loginUser,
  adminLogin,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  addSavedPaymentMethod,
  deleteSavedPaymentMethod,
} from '../controllers/authController';
import {
  getCategories,
  getCategoryBySlug,
  getProducts,
  getSearchSuggestions,
  getProductBySlug,
  checkDeliveryAvailability,
  compareProducts,
  createReview,
  updateReview,
  deleteReview,
  askQuestion,
} from '../controllers/catalogController';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  toggleSaveForLater,
  removeCartItem,
  applyCartCoupon,
  removeCartCoupon,
  getActiveCoupons,
  getWishlist,
  toggleWishlist,
  moveWishlistToCart,
  calculateCheckoutSummary,
} from '../controllers/shoppingController';
import {
  initiatePaymentOrder,
  verifyPaymentEndpoint,
  createOrder,
  getMyOrders,
  getOrderDetails,
  cancelCustomerOrder,
  requestOrderReturn,
  reorderItems,
  getOrderInvoice,
  getNotifications,
  markNotificationsRead,
} from '../controllers/orderController';
import {
  getDashboardMetrics,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminCustomers,
  toggleCustomerActiveState,
  getAdminOrders,
  updateAdminOrderStatus,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  getAdminReviews,
  getAdminQuestions,
  answerCustomerQuestion,
} from '../controllers/adminController';

export const apiRouter = Router();

// ==========================================================
// HEALTH CHECK (RENDER WEB SERVICE HEALTH ENDPOINT)
// ==========================================================
apiRouter.get('/health', (_req, res) => {
  return sendSuccess(
    res,
    {
      status: 'ok',
      service: 'aethelgard-api-server',
      database: getConnectionStatus(),
      timestamp: new Date().toISOString(),
    },
    'API service is healthy.'
  );
});

// ==========================================================
// AUTHENTICATION ROUTES (/api/auth)
// ==========================================================
apiRouter.post('/auth/register', authRateLimiter, registerUser);
apiRouter.post('/auth/login', authRateLimiter, loginUser);
apiRouter.post('/auth/admin/login', authRateLimiter, adminLogin);
apiRouter.post('/auth/verify-otp', otpRateLimiter, verifyOtp);
apiRouter.post('/auth/resend-otp', otpRateLimiter, resendOtp);
apiRouter.post('/auth/forgot-password', otpRateLimiter, forgotPassword);
apiRouter.post('/auth/reset-password', authRateLimiter, resetPassword);
apiRouter.get('/auth/me', requireAuth, getMe);
apiRouter.post('/auth/logout', (_req, res) => sendSuccess(res, {}, 'Logged out successfully.'));

// ==========================================================
// USER PROFILE, ADDRESSES & SAVED PAYMENT METHODS (/api/users)
// ==========================================================
apiRouter.put('/users/profile', requireAuth, updateProfile);
apiRouter.put('/users/password', requireAuth, changePassword);
apiRouter.post('/users/addresses', requireAuth, addAddress);
apiRouter.put('/users/addresses/:id', requireAuth, updateAddress);
apiRouter.delete('/users/addresses/:id', requireAuth, deleteAddress);
apiRouter.post('/users/payment-methods', requireAuth, addSavedPaymentMethod);
apiRouter.delete('/users/payment-methods/:id', requireAuth, deleteSavedPaymentMethod);

// ==========================================================
// CATEGORIES & PRODUCTS (/api/categories, /api/products)
// ==========================================================
apiRouter.get('/categories', getCategories);
apiRouter.get('/categories/:slug', getCategoryBySlug);

apiRouter.get('/products', getProducts);
apiRouter.get('/products/suggestions', getSearchSuggestions);
apiRouter.get('/products/compare', compareProducts);
apiRouter.get('/products/delivery-check', checkDeliveryAvailability);
apiRouter.get('/products/:slug', getProductBySlug);

// ==========================================================
// REVIEWS & QUESTIONS (/api/reviews, /api/questions)
// ==========================================================
apiRouter.post('/reviews', requireAuth, createReview);
apiRouter.put('/reviews/:id', requireAuth, updateReview);
apiRouter.delete('/reviews/:id', requireAuth, deleteReview);

apiRouter.post('/questions', requireAuth, askQuestion);

// ==========================================================
// CART, WISHLIST, COUPONS & CHECKOUT
// ==========================================================
apiRouter.get('/cart', requireAuth, getCart);
apiRouter.post('/cart/items', requireAuth, addToCart);
apiRouter.put('/cart/items/:itemId', requireAuth, updateCartItemQuantity);
apiRouter.patch('/cart/items/:itemId/save-for-later', requireAuth, toggleSaveForLater);
apiRouter.delete('/cart/items/:itemId', requireAuth, removeCartItem);
apiRouter.post('/cart/coupon', requireAuth, applyCartCoupon);
apiRouter.delete('/cart/coupon', requireAuth, removeCartCoupon);

apiRouter.get('/coupons', getActiveCoupons);

apiRouter.get('/wishlist', requireAuth, getWishlist);
apiRouter.post('/wishlist/toggle', requireAuth, toggleWishlist);
apiRouter.post('/wishlist/:productId/move-to-cart', requireAuth, moveWishlistToCart);

apiRouter.post('/checkout/calculate', requireAuth, calculateCheckoutSummary);

// ==========================================================
// PAYMENTS & ORDERS (/api/payments, /api/orders)
// ==========================================================
apiRouter.post('/payments/create-order', requireAuth, initiatePaymentOrder);
apiRouter.post('/payments/verify', requireAuth, verifyPaymentEndpoint);

apiRouter.post('/orders', requireAuth, createOrder);
apiRouter.get('/orders', requireAuth, getMyOrders);
apiRouter.get('/orders/:id', requireAuth, getOrderDetails);
apiRouter.post('/orders/:id/cancel', requireAuth, cancelCustomerOrder);
apiRouter.post('/orders/:id/return', requireAuth, requestOrderReturn);
apiRouter.post('/orders/:id/reorder', requireAuth, reorderItems);
apiRouter.get('/orders/:id/invoice', requireAuth, getOrderInvoice);

// ==========================================================
// NOTIFICATIONS (/api/notifications)
// ==========================================================
apiRouter.get('/notifications', requireAuth, getNotifications);
apiRouter.post('/notifications/read-all', requireAuth, markNotificationsRead);

// ==========================================================
// PROTECTED ADMIN ROUTES (/api/admin)
// ==========================================================
apiRouter.get('/admin/dashboard', requireAdmin, getDashboardMetrics);
apiRouter.get('/admin/products', requireAdmin, getAdminProducts);
apiRouter.post('/admin/products', requireAdmin, createAdminProduct);
apiRouter.put('/admin/products/:id', requireAdmin, updateAdminProduct);
apiRouter.delete('/admin/products/:id', requireAdmin, deleteAdminProduct);

apiRouter.get('/admin/customers', requireAdmin, getAdminCustomers);
apiRouter.patch('/admin/customers/:id/toggle-active', requireAdmin, toggleCustomerActiveState);

apiRouter.get('/admin/orders', requireAdmin, getAdminOrders);
apiRouter.patch('/admin/orders/:id/status', requireAdmin, updateAdminOrderStatus);

apiRouter.get('/admin/coupons', requireAdmin, getAdminCoupons);
apiRouter.post('/admin/coupons', requireAdmin, createAdminCoupon);
apiRouter.put('/admin/coupons/:id', requireAdmin, updateAdminCoupon);

apiRouter.get('/admin/reviews', requireAdmin, getAdminReviews);
apiRouter.delete('/admin/reviews/:id', requireAdmin, deleteReview);

apiRouter.get('/admin/questions', requireAdmin, getAdminQuestions);
apiRouter.post('/admin/questions/:id/answer', requireAdmin, answerCustomerQuestion);
