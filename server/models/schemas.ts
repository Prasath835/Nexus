import mongoose, { Schema, Document } from 'mongoose';

// ==========================================================
// SUBDOCUMENT INTERFACES & SCHEMAS
// ==========================================================

export interface IAddress {
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

export interface ISavedPaymentMethod {
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

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  otpCode?: string;
  otpExpiresAt?: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
  addresses: IAddress[];
  savedPaymentMethods: ISavedPaymentMethod[];
  createdAt: string;
  updatedAt: string;
}

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories: string[];
  image: string;
  isActive: boolean;
  createdAt: string;
}

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
  isMain: boolean;
}

export interface IProductVariant {
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

export interface IProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  categorySlug: string;
  subcategory: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  stock: number;
  images: IProductImage[];
  videoUrl?: string;
  variants: IProductVariant[];
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
  updatedAt: string;
}

export interface ICartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  savedForLater: boolean;
  addedAt: string;
}

export interface ICart {
  id: string;
  userId: string;
  items: ICartItem[];
  appliedCouponCode?: string;
  updatedAt: string;
}

export interface IWishlist {
  id: string;
  userId: string;
  productIds: string[];
  updatedAt: string;
}

export interface ICoupon {
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
  createdAt: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Return Requested'
  | 'Returned'
  | 'Refund Initiated'
  | 'Refunded';

export type PaymentStatus = 'Pending' | 'Authorized' | 'Paid' | 'Failed' | 'Refund Initiated' | 'Refunded';

export interface IOrderItemSnapshot {
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
}

export interface IOrderStatusTimeline {
  status: OrderStatus;
  note: string;
  timestamp: string;
  updatedBy: string;
}

export interface IReturnRequest {
  type: 'Return' | 'Replacement';
  reason: string;
  description: string;
  images: string[];
  status: 'Requested' | 'Approved' | 'Rejected' | 'Completed';
  requestedAt: string;
  resolvedAt?: string;
}

export interface IRefundDetails {
  status: 'None' | 'Initiated' | 'Processed' | 'Failed';
  amount: number;
  reason: string;
  providerReference?: string;
  initiatedAt?: string;
  completedAt?: string;
}

export interface IOrder {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItemSnapshot[];
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
  shippingAddress: IAddress;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';
  paymentStatus: PaymentStatus;
  paymentId?: string;
  providerOrderId?: string;
  orderStatus: OrderStatus;
  timeline: IOrderStatusTimeline[];
  cancellationReason?: string;
  returnRequest?: IReturnRequest;
  refundDetails?: IRefundDetails;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  id: string;
  orderId?: string;
  userId: string;
  providerOrderId: string;
  providerPaymentId?: string;
  signature?: string;
  amount: number;
  currency: string;
  method: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';
  status: PaymentStatus;
  refundId?: string;
  refundAmount?: number;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface IReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  verifiedPurchase: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IQuestion {
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

export interface INotification {
  id: string;
  userId: string; // 'admin' or customer userId
  type: 'order' | 'account' | 'operational';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// ==========================================================
// MONGOOSE SCHEMAS & INDEX DEFINITIONS (FOR MONGODB ATLAS)
// ==========================================================

const AddressSchema = new Schema<IAddress>({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  house: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  isDefault: { type: Boolean, default: false },
});

const SavedPaymentMethodSchema = new Schema<ISavedPaymentMethod>({
  id: { type: String, required: true },
  type: { type: String, enum: ['Card', 'UPI', 'Wallet'], required: true },
  provider: { type: String, required: true },
  label: { type: String, required: true },
  last4: { type: String },
  expiryMonth: { type: String },
  expiryYear: { type: String },
  upiHandle: { type: String },
  tokenReference: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    avatarUrl: { type: String },
    otpCode: { type: String },
    otpExpiresAt: { type: String },
    resetToken: { type: String },
    resetTokenExpiresAt: { type: String },
    addresses: [AddressSchema],
    savedPaymentMethods: [SavedPaymentMethodSchema],
  },
  { timestamps: true }
);

const ProductVariantSchema = new Schema<IProductVariant>({
  id: { type: String, required: true },
  sku: { type: String, required: true, index: true },
  size: { type: String },
  color: { type: String },
  capacity: { type: String },
  finish: { type: String },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  isAvailable: { type: Boolean, default: true },
  image: { type: String },
});

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    category: { type: String, required: true, index: true },
    categorySlug: { type: String, required: true, index: true },
    subcategory: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        alt: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],
    videoUrl: { type: String },
    variants: [ProductVariantSchema],
    specifications: { type: Map, of: String },
    attributes: {
      material: String,
      origin: String,
      warranty: String,
      weight: String,
    },
    ratingSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      distribution: { type: Map, of: Number },
    },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isDeal: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const OrderSchema = new Schema<IOrder>(
  {
    id: { type: String, required: true, unique: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [
      {
        productId: String,
        productName: String,
        productSlug: String,
        productImage: String,
        brand: String,
        variantId: String,
        variantLabel: String,
        sku: String,
        quantity: Number,
        unitPrice: Number,
        originalUnitPrice: Number,
        lineSubtotal: Number,
        lineDiscount: Number,
        lineTotal: Number,
      },
    ],
    pricing: {
      subtotal: Number,
      productDiscount: Number,
      couponCode: String,
      couponDiscount: Number,
      deliveryMethod: String,
      deliveryFee: Number,
      taxRate: Number,
      taxAmount: Number,
      finalTotal: Number,
    },
    shippingAddress: AddressSchema,
    paymentMethod: { type: String, enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'COD'], required: true },
    paymentStatus: { type: String, required: true },
    paymentId: { type: String },
    providerOrderId: { type: String },
    orderStatus: { type: String, required: true, index: true },
    timeline: [
      {
        status: String,
        note: String,
        timestamp: String,
        updatedBy: String,
      },
    ],
    cancellationReason: { type: String },
    returnRequest: {
      type: { type: String },
      reason: String,
      description: String,
      images: [String],
      status: String,
      requestedAt: String,
      resolvedAt: String,
    },
    refundDetails: {
      status: String,
      amount: Number,
      reason: String,
      providerReference: String,
      initiatedAt: String,
      completedAt: String,
    },
    idempotencyKey: { type: String, index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });

export const MongooseUser = mongoose.models.User || mongoose.model<IUser & Document>('User', UserSchema);
export const MongooseProduct = mongoose.models.Product || mongoose.model<IProduct & Document>('Product', ProductSchema);
export const MongooseOrder = mongoose.models.Order || mongoose.model<IOrder & Document>('Order', OrderSchema);
