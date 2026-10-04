export interface Address {
  id: string;
  name: string;
  phone: string;
  house: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  type: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  type: 'Card' | 'UPI' | 'Wallet';
  provider: string;
  label: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  upiHandle?: string;
  tokenReference: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  addresses: Address[];
  savedPaymentMethods: SavedPaymentMethod[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories: string[];
  image: string;
  productCount?: number;
  subcategoryCounts?: Array<{ name: string; count: number }>;
}

export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
  isMain: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  capacity?: string;
  finish?: string;
  price: number;
  originalPrice: number;
  stock: number;
  isAvailable: boolean;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  categorySlug: string;
  subcategory: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  stock: number;
  images: ProductImage[];
  videoUrl?: string;
  variants: ProductVariant[];
  specifications: Record<string, string>;
  attributes: {
    material?: string;
    origin?: string;
    warranty?: string;
    weight?: string;
  };
  ratingSummary: {
    average: number;
    count: number;
    distribution: Record<number, number>;
  };
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isDeal: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CartItemEnriched {
  cartItemId: string;
  savedForLater: boolean;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  brand: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  lineSubtotal?: number;
  lineDiscount?: number;
  lineTotal?: number;
  availableStock: number;
  inStock?: boolean;
}

export interface CartPricing {
  subtotal: number;
  productDiscount: number;
  discountedSubtotal: number;
  couponCode?: string;
  couponDiscount: number;
  couponMessage?: string;
  deliveryMethod?: 'Standard' | 'Express';
  deliveryFee: number;
  taxRate: number;
  taxAmount: number;
  finalTotal: number;
}

export interface CartPayload {
  cartId: string;
  items: CartItemEnriched[];
  savedForLater: CartItemEnriched[];
  pricing: CartPricing;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minPurchase: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    brand: string;
    variantId: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    originalUnitPrice: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
  }>;
  pricing: {
    subtotal: number;
    productDiscount: number;
    couponCode?: string;
    couponDiscount: number;
    deliveryMethod: 'Standard' | 'Express';
    deliveryFee: number;
    taxRate: number;
    taxAmount: number;
    finalTotal: number;
  };
  shippingAddress: Address;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';
  paymentStatus: string;
  paymentId?: string;
  providerOrderId?: string;
  orderStatus: string;
  timeline: Array<{
    status: string;
    note: string;
    timestamp: string;
    updatedBy: string;
  }>;
  cancellationReason?: string;
  returnRequest?: {
    type: 'Return' | 'Replacement';
    reason: string;
    description: string;
    images: string[];
    status: string;
    requestedAt: string;
    resolvedAt?: string;
  };
  refundDetails?: {
    status: string;
    amount: number;
    reason: string;
    providerReference?: string;
    initiatedAt?: string;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'order' | 'account' | 'operational';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
