import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Truck, CreditCard, MapPin, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import { Address, Order } from '../types';
import {
  ResilientImage,
  LoadingSkeleton,
  ErrorState,
  formatINR,
} from '../components/common/UIElements';

export const CheckoutPage: React.FC = () => {
  const { user, refreshUser, refreshCart, buyNowItem, setBuyNowItem, showToast } = useStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isBuyNowMode = searchParams.get('mode') === 'buynow' && Boolean(buyNowItem);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Standard' | 'Express'>('Standard');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'UPI' | 'NetBanking' | 'Wallet' | 'COD'>('Card');
  const [couponCode, setCouponCode] = useState<string>('');

  // Server-calculated summary
  const [summary, setSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // New Address inline form
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    name: '',
    phone: '',
    house: '',
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    type: 'Home' as 'Home' | 'Work' | 'Other',
  });

  // Payment verification & Order placement state
  const [processingOrder, setProcessingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [idempotencyKey] = useState(() => `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  useEffect(() => {
    if (user && user.addresses.length > 0 && !selectedAddressId) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [user, selectedAddressId]);

  const fetchServerCalculation = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingSummary(true);
      setSummaryError(null);
      const res = await apiRequest<{ summary: any }>('/checkout/calculate', {
        method: 'POST',
        body: JSON.stringify({
          buyNowItem: isBuyNowMode ? buyNowItem : undefined,
          deliveryMethod,
          couponCode: couponCode || undefined,
        }),
      });
      setSummary(res.data.summary);
      if (res.data.summary.couponCode) {
        setCouponCode(res.data.summary.couponCode);
      }
    } catch (err: any) {
      setSummaryError(err.message || 'Could not validate checkout items on server.');
    } finally {
      setLoadingSummary(false);
    }
  }, [user, isBuyNowMode, buyNowItem, deliveryMethod, couponCode]);

  useEffect(() => {
    fetchServerCalculation();
  }, [fetchServerCalculation]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-zinc-600 mb-4">Please sign in to proceed with checkout.</p>
        <Link
          to="/login"
          className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ address: Address }>('/users/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...addrForm, isDefault: true }),
      });
      await refreshUser();
      setSelectedAddressId(res.data.address.id);
      setShowNewAddressForm(false);
      showToast('Delivery address added.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select a delivery address first.', 'error');
      setStep(1);
      return;
    }

    try {
      setProcessingOrder(true);

      let providerOrderId: string | undefined;
      let providerPaymentId: string | undefined;
      let paymentSignature: string | undefined;

      // For online payments (Card, UPI, NetBanking, Wallet):
      // 1. Create payment order on backend
      // 2. Verify HMAC-SHA256 payment signature on backend
      if (paymentMethod !== 'COD') {
        const payInitRes = await apiRequest<{ gatewayOrder: any }>('/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({
            buyNowItem: isBuyNowMode ? buyNowItem : undefined,
            couponCode: summary?.couponCode,
            deliveryMethod,
            paymentMethod,
          }),
        });

        const gw = payInitRes.data.gatewayOrder;
        providerOrderId = gw.providerOrderId;
        providerPaymentId = gw.sandboxCredentials.providerPaymentId;
        paymentSignature = gw.sandboxCredentials.signature;

        // Explicitly call backend payment verification
        await apiRequest('/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            providerOrderId,
            providerPaymentId,
            signature: paymentSignature,
          }),
        });
      }

      // Create final order on backend (revalidates stock, price, coupon, tax, and delivery fee)
      const orderRes = await apiRequest<{ order: Order }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddressId,
          deliveryMethod,
          paymentMethod,
          providerOrderId,
          providerPaymentId,
          paymentSignature,
          buyNowItem: isBuyNowMode ? buyNowItem : undefined,
          couponCode: summary?.couponCode,
          idempotencyKey,
        }),
      });

      setConfirmedOrder(orderRes.data.order);
      if (isBuyNowMode) {
        setBuyNowItem(null);
      }
      await refreshCart();
      setStep(5);
      showToast(orderRes.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Order placement failed.', 'error');
    } finally {
      setProcessingOrder(false);
    }
  };

  const selectedAddressObj = user.addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10">
      {/* Checkout Stepper Header */}
      <div className="border-b border-zinc-200 pb-6 mb-8">
        <div className="text-xs text-zinc-500 mb-2">
          {isBuyNowMode ? 'Direct Buy Now Express Checkout' : 'Standard Bag Checkout'} · Authoritative Server Recalculation
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 mb-6">
          Checkout
        </h1>

        <div className="grid grid-cols-5 gap-2 text-xs">
          {[
            { num: 1, label: '1. Address' },
            { num: 2, label: '2. Delivery' },
            { num: 3, label: '3. Payment' },
            { num: 4, label: '4. Review' },
            { num: 5, label: '5. Confirmation' },
          ].map((s) => (
            <div
              key={s.num}
              className={`py-2 px-3 rounded border font-medium truncate ${
                step === s.num
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-white text-zinc-400 border-zinc-200'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {step === 5 && confirmedOrder ? (
        /* STEP 5: ORDER CONFIRMATION */
        <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">Order Confirmed</div>
              <h2 className="font-display text-3xl font-semibold text-zinc-900">
                Order #{confirmedOrder.orderNumber}
              </h2>
            </div>
          </div>

          <p className="text-sm text-zinc-600">
            Thank you, {confirmedOrder.customerName}. Your order has been recorded with purchase-time price protection and GST invoice{' '}
            <strong className="font-mono text-zinc-900">{confirmedOrder.invoiceNumber}</strong>.
          </p>

          <div className="p-4 bg-[#F8F8F5] border border-zinc-200 rounded-md text-xs space-y-2 tabular-nums">
            <div className="flex justify-between">
              <span className="text-zinc-500">Payment Method &amp; Status</span>
              <span className="font-semibold text-zinc-900">
                {confirmedOrder.paymentMethod} · {confirmedOrder.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Delivery Method</span>
              <span className="font-semibold text-zinc-900">
                {confirmedOrder.pricing.deliveryMethod} Shipping
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Amount Paid / Payable</span>
              <span className="font-semibold text-zinc-900 text-sm">
                {formatINR(confirmedOrder.pricing.finalTotal)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={`/orders/${confirmedOrder.id}`}
              className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              View Order Tracking &amp; GST Invoice
            </Link>
            <Link
              to="/products"
              className="px-5 py-2.5 text-xs font-medium border border-zinc-300 text-zinc-800 rounded-md hover:bg-zinc-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : loadingSummary ? (
        <LoadingSkeleton rows={3} />
      ) : summaryError ? (
        <ErrorState message={summaryError} onRetry={fetchServerCalculation} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Active Step Controls */}
          <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6">
            {step === 1 && (
              /* STEP 1: ADDRESS SELECTION */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-700" />
                    <h2 className="font-display text-2xl font-semibold text-zinc-900">
                      Step 1: Select Delivery Address
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm((prev) => !prev)}
                    className="px-3.5 py-2 text-xs font-semibold border border-zinc-300 rounded-md hover:bg-zinc-50 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {showNewAddressForm && (
                  <form
                    onSubmit={handleSaveNewAddress}
                    className="p-5 bg-[#F8F8F5] border border-zinc-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
                  >
                    <input
                      required
                      placeholder="Recipient Full Name"
                      value={addrForm.name}
                      onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    />
                    <input
                      required
                      placeholder="Phone Number"
                      value={addrForm.phone}
                      onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    />
                    <input
                      required
                      placeholder="House / Flat / Suite"
                      value={addrForm.house}
                      onChange={(e) => setAddrForm({ ...addrForm, house: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded sm:col-span-2"
                    />
                    <input
                      placeholder="Street / Road"
                      value={addrForm.street}
                      onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    />
                    <input
                      placeholder="Area / Locality"
                      value={addrForm.area}
                      onChange={(e) => setAddrForm({ ...addrForm, area: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    />
                    <input
                      required
                      placeholder="City"
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    />
                    <input
                      required
                      placeholder="State"
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    />
                    <input
                      required
                      maxLength={6}
                      placeholder="6-Digit Pincode"
                      value={addrForm.pincode}
                      onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded font-mono"
                    />
                    <select
                      value={addrForm.type}
                      onChange={(e) =>
                        setAddrForm({ ...addrForm, type: e.target.value as 'Home' | 'Work' | 'Other' })
                      }
                      className="px-3 py-2 bg-white border border-zinc-300 rounded"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="px-4 py-2 border border-zinc-300 rounded bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors block ${
                        selectedAddressId === addr.id
                          ? 'border-zinc-900 bg-zinc-900/5'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-zinc-900">
                          {addr.name} · {addr.type}
                        </span>
                        <input
                          type="radio"
                          name="deliveryAddress"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                        />
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        {addr.house}, {addr.street}, {addr.area}, {addr.city}, {addr.state} —{' '}
                        <span className="font-mono font-medium">{addr.pincode}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Phone: {addr.phone}</p>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    disabled={!selectedAddressId}
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Continue to Delivery Method
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              /* STEP 2: DELIVERY METHOD */
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-zinc-700" />
                  <h2 className="font-display text-2xl font-semibold text-zinc-900">
                    Step 2: Select Delivery Method
                  </h2>
                </div>

                <div className="space-y-3">
                  <label
                    className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer ${
                      deliveryMethod === 'Standard'
                        ? 'border-zinc-900 bg-zinc-900/5'
                        : 'border-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        Standard Insured White-Glove Transit (3–5 Business Days)
                      </div>
                      <div className="text-xs text-zinc-500">
                        Complimentary on orders above ₹50,000 (₹450 below threshold)
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={deliveryMethod === 'Standard'}
                      onChange={() => setDeliveryMethod('Standard')}
                    />
                  </label>

                  <label
                    className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer ${
                      deliveryMethod === 'Express'
                        ? 'border-zinc-900 bg-zinc-900/5'
                        : 'border-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        Priority Air Courier (24–48 Hours Dedicated Dispatch)
                      </div>
                      <div className="text-xs text-zinc-500">
                        Flat ₹950 priority handling &amp; climate-controlled air crate
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={deliveryMethod === 'Express'}
                      onChange={() => setDeliveryMethod('Express')}
                    />
                  </label>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-medium border border-zinc-300 rounded-md"
                  >
                    Back to Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                  >
                    Continue to Payment Method
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              /* STEP 3: PAYMENT METHOD */
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-zinc-700" />
                  <h2 className="font-display text-2xl font-semibold text-zinc-900">
                    Step 3: Select Payment Instrument
                  </h2>
                </div>

                <p className="text-xs text-zinc-600">
                  Online payments are initialized on the backend and verified using HMAC-SHA256 gateway signatures in Sandbox mode. Raw card numbers or CVVs are never stored.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'Card',
                        title: 'Credit / Debit Card (Sandbox)',
                        desc: 'Visa, Mastercard, Amex via tokenized gateway',
                      },
                      {
                        id: 'UPI',
                        title: 'UPI Instant Collect',
                        desc: 'BHIM, Google Pay, PhonePe, HDFC UPI',
                      },
                      {
                        id: 'NetBanking',
                        title: 'Corporate & Retail Net Banking',
                        desc: 'HDFC, ICICI, Axis, SBI, Kotak',
                      },
                      {
                        id: 'Wallet',
                        title: 'Digital Wallets',
                        desc: 'Amazon Pay, Paytm Sandbox Wallet',
                      },
                      {
                        id: 'COD',
                        title: 'Cash / Pay on Delivery (COD)',
                        desc: 'Pay upon physical inspection at delivery',
                      },
                    ] as const
                  ).map((pm) => (
                    <label
                      key={pm.id}
                      className={`p-4 rounded-lg border cursor-pointer block ${
                        paymentMethod === pm.id
                          ? 'border-zinc-900 bg-zinc-900/5'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-zinc-900">{pm.title}</span>
                        <input
                          type="radio"
                          checked={paymentMethod === pm.id}
                          onChange={() => setPaymentMethod(pm.id)}
                        />
                      </div>
                      <p className="text-xs text-zinc-500">{pm.desc}</p>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-medium border border-zinc-300 rounded-md"
                  >
                    Back to Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              /* STEP 4: ORDER REVIEW & FINAL AUTHORITATIVE CONFIRMATION */
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-700" />
                  <h2 className="font-display text-2xl font-semibold text-zinc-900">
                    Step 4: Final Order Review
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8F8F5] border border-zinc-200 rounded-lg text-xs">
                  <div>
                    <div className="font-semibold text-zinc-900 mb-1">Shipping Destination</div>
                    {selectedAddressObj ? (
                      <div className="text-zinc-600">
                        {selectedAddressObj.name} · {selectedAddressObj.phone}
                        <br />
                        {selectedAddressObj.house}, {selectedAddressObj.street}, {selectedAddressObj.city},{' '}
                        {selectedAddressObj.state} — {selectedAddressObj.pincode}
                      </div>
                    ) : (
                      <div className="text-red-600">No address selected</div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 mb-1">Fulfillment &amp; Payment</div>
                    <div className="text-zinc-600">
                      Delivery: <strong>{deliveryMethod}</strong>
                      <br />
                      Payment Method: <strong>{paymentMethod}</strong> (Sandbox Verified)
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg">
                  {(summary?.items || []).map((item: any) => (
                    <div
                      key={`${item.productId}_${item.variantId}`}
                      className="p-4 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-12 bg-[#F4F3EF] rounded overflow-hidden shrink-0">
                          <ResilientImage
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900">{item.productName}</div>
                          <div className="text-zinc-500">
                            {item.variantLabel} · Qty: {item.quantity} · SKU: {item.sku}
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold text-zinc-900 tabular-nums">
                        {formatINR(item.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-xs font-medium border border-zinc-300 rounded-md"
                  >
                    Back to Payment
                  </button>
                  <button
                    type="button"
                    disabled={processingOrder}
                    onClick={handlePlaceOrder}
                    className="px-6 py-3 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-40"
                  >
                    {processingOrder
                      ? 'Verifying & Recording Order...'
                      : `Authorize & Place Order (${formatINR(summary?.finalTotal || 0)})`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Authoritative Calculation Sidebar */}
          <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
            <h3 className="font-display text-xl font-semibold text-zinc-900">
              Server Price Calculation
            </h3>
            {summary && (
              <div className="space-y-2.5 text-xs tabular-nums">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal ({summary.items.length} items)</span>
                  <span>{formatINR(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Product Discount</span>
                  <span>− {formatINR(summary.productDiscount)}</span>
                </div>
                {summary.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon ({summary.couponCode})</span>
                    <span>− {formatINR(summary.couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>{summary.deliveryMethod} Delivery</span>
                  <span>{summary.deliveryFee === 0 ? 'Complimentary' : formatINR(summary.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>GST ({summary.taxRate}%)</span>
                  <span>+ {formatINR(summary.taxAmount)}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 flex justify-between text-base font-semibold text-zinc-900">
                  <span>Final Total</span>
                  <span>{formatINR(summary.finalTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
