import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Bookmark, ShoppingBag, Tag, ArrowRight, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import { Coupon } from '../types';
import {
  ResilientImage,
  EmptyState,
  LoadingSkeleton,
  formatINR,
} from '../components/common/UIElements';

export const CartPage: React.FC = () => {
  const {
    user,
    cart,
    cartLoading,
    updateCartQuantity,
    removeCartItem,
    toggleSaveForLater,
    applyCoupon,
    removeCoupon,
    setBuyNowItem,
  } = useStore();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    apiRequest<{ coupons: Coupon[] }>('/coupons')
      .then((res) => setAvailableCoupons(res.data.coupons))
      .catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-14">
        <EmptyState
          title="Sign in to view your shopping bag"
          description="Your shopping bag, saved items, and applied collector coupons are persisted securely to your account."
          actionLabel="Sign In to Account"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  if (cartLoading && !cart) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <LoadingSkeleton rows={3} />
      </div>
    );
  }

  const activeItems = cart?.items || [];
  const savedItems = cart?.savedForLater || [];
  const pricing = cart?.pricing;

  const handleApplyCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    const ok = await applyCoupon(couponInput.trim());
    if (ok) setCouponInput('');
    setApplyingCoupon(false);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-12">
      <div className="border-b border-zinc-200 pb-6">
        <div className="text-xs text-zinc-500 mb-1">Server-Validated Inventory &amp; Tax Calculation</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900">
          Shopping Bag ({activeItems.reduce((acc, i) => acc + i.quantity, 0)})
        </h1>
      </div>

      {activeItems.length === 0 ? (
        <EmptyState
          title="Your shopping bag is currently empty"
          description="Explore our architectural living, studio audio, and horology collections to add instruments to your bag."
          actionLabel="Explore Catalog"
          onAction={() => navigate('/products')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Cart Items */}
          <div className="lg:col-span-8 space-y-4">
            {activeItems.map((item) => (
              <div
                key={item.cartItemId}
                className="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col sm:flex-row gap-5"
              >
                <Link
                  to={`/products/${item.productSlug}`}
                  className="w-full sm:w-32 aspect-[4/3] bg-[#F4F3EF] rounded overflow-hidden shrink-0"
                >
                  <ResilientImage
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">
                        {item.brand} · <span className="font-mono">SKU: {item.sku}</span>
                      </div>
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="text-base font-semibold text-zinc-900 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <div className="text-xs text-zinc-600 mt-1">{item.variantLabel}</div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div className="text-sm font-semibold text-zinc-900">
                        {formatINR(item.lineTotal || item.unitPrice * item.quantity)}
                      </div>
                      {item.originalUnitPrice > item.unitPrice && (
                        <div className="text-xs text-zinc-400 line-through">
                          {formatINR(item.originalUnitPrice * item.quantity)}
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {formatINR(item.unitPrice)} each
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center border border-zinc-300 rounded bg-white tabular-nums">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)}
                        className="px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      >
                        −
                      </button>
                      <span className="px-3.5 py-1 text-xs font-semibold text-zinc-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.availableStock}
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)}
                        className="px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleSaveForLater(item.cartItemId)}
                        className="text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save for Later</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cartItemId)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Authoritative Server Price & Coupon Summary */}
          <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
            <h2 className="font-display text-2xl font-semibold text-zinc-900">Order Summary</h2>

            {/* Coupon Code Box */}
            <div className="space-y-3 pb-5 border-b border-zinc-200">
              <label className="block text-xs font-semibold text-zinc-800">
                Privilege / Coupon Code
              </label>

              {pricing?.couponCode ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs">
                  <div>
                    <div className="font-semibold text-emerald-900 font-mono">
                      {pricing.couponCode}
                    </div>
                    <div className="text-emerald-700">
                      Saved {formatINR(pricing.couponDiscount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="p-1 text-emerald-800 hover:text-emerald-950"
                    title="Remove coupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. ATELIER10)"
                    className="flex-1 px-3 py-2 text-xs border border-zinc-300 rounded-md font-mono uppercase"
                  />
                  <button
                    type="submit"
                    disabled={applyingCoupon}
                    className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 whitespace-nowrap"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Available Coupons Helper */}
              {availableCoupons.length > 0 && !pricing?.couponCode && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-zinc-500">Available collector codes:</div>
                  {availableCoupons.map((cpn) => (
                    <button
                      key={cpn.id}
                      type="button"
                      onClick={() => applyCoupon(cpn.code)}
                      className="w-full text-left p-2 rounded border border-dashed border-zinc-300 hover:border-zinc-900 text-xs flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="font-mono font-semibold text-zinc-900 inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {cpn.code}
                      </span>
                      <span className="text-zinc-500 truncate">{cpn.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Breakdown Formula */}
            {pricing && (
              <div className="space-y-2.5 text-xs tabular-nums">
                <div className="flex justify-between text-zinc-600">
                  <span>Original MRP Subtotal</span>
                  <span>{formatINR(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Product Discount</span>
                  <span>− {formatINR(pricing.productDiscount)}</span>
                </div>
                {pricing.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount ({pricing.couponCode})</span>
                    <span>− {formatINR(pricing.couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>Estimated Delivery Charge</span>
                  <span>{pricing.deliveryFee === 0 ? 'Complimentary' : formatINR(pricing.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>GST / Tax ({pricing.taxRate}%)</span>
                  <span>+ {formatINR(pricing.taxAmount)}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 flex justify-between text-base font-semibold text-zinc-900">
                  <span>Final Payable Amount</span>
                  <span>{formatINR(pricing.finalTotal)}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setBuyNowItem(null);
                navigate('/checkout');
              }}
              className="w-full py-3 px-5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>Proceed to Secure Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Saved For Later Section */}
      {savedItems.length > 0 && (
        <section className="pt-8 border-t border-zinc-200">
          <h2 className="font-display text-2xl font-semibold text-zinc-900 mb-4">
            Saved for Later ({savedItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItems.map((item) => (
              <div
                key={item.cartItemId}
                className="bg-white border border-zinc-200 rounded-lg p-4 flex gap-4 items-center"
              >
                <div className="w-20 h-20 bg-[#F4F3EF] rounded overflow-hidden shrink-0">
                  <ResilientImage
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500">{item.brand}</div>
                  <Link
                    to={`/products/${item.productSlug}`}
                    className="text-sm font-semibold text-zinc-900 truncate block"
                  >
                    {item.productName}
                  </Link>
                  <div className="text-xs font-semibold text-zinc-900 tabular-nums mt-1">
                    {formatINR(item.unitPrice)}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleSaveForLater(item.cartItemId)}
                      className="font-semibold text-zinc-900 hover:underline"
                    >
                      Move to Bag
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.cartItemId)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const { user, wishlistProducts, toggleWishlist, moveWishlistToCart } = useStore();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-14">
        <EmptyState
          title="Sign in to view your saved wishlist"
          description="Save instruments and architectural furniture pieces to revisit or move directly to your bag."
          actionLabel="Sign In"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10">
      <div className="border-b border-zinc-200 pb-6 mb-8">
        <div className="text-xs text-zinc-500 mb-1">Curated Personal Archive</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900">
          Saved Wishlist ({wishlistProducts.length})
        </h1>
      </div>

      {wishlistProducts.length === 0 ? (
        <EmptyState
          title="No instruments saved in your wishlist"
          description="Tap the heart icon on any product to curate your personal shortlist."
          actionLabel="Browse Collection"
          onAction={() => navigate('/products')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-zinc-200 rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <Link to={`/products/${p.slug}`} className="aspect-[4/3] bg-[#F4F3EF] block">
                <ResilientImage
                  src={p.images[0]?.url}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-zinc-500">
                    {p.brand} · {p.subcategory}
                  </div>
                  <Link
                    to={`/products/${p.slug}`}
                    className="text-base font-semibold text-zinc-900 hover:underline block mt-1"
                  >
                    {p.name}
                  </Link>
                  <div className="text-sm font-semibold text-zinc-900 tabular-nums mt-2">
                    {formatINR(p.price)}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => moveWishlistToCart(p.id)}
                    className="flex-1 py-2 px-3 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Move to Bag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(p.id)}
                    className="p-2 text-zinc-500 hover:text-red-600 border border-zinc-200 rounded-md"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
