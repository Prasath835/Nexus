import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  RotateCcw,
  XCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { Order } from '../types';
import { useStore } from '../context/StoreContext';
import {
  ResilientImage,
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  Modal,
  formatINR,
} from '../components/common/UIElements';

export const OrdersListPage: React.FC = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ orders: Order[] }>('/orders');
      setOrders(res.data.orders);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-14">
        <EmptyState
          title="Sign in to view your order history"
          description="Track active shipments, download GST invoices, or initiate returns."
          actionLabel="Sign In"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10">
      <div className="border-b border-zinc-200 pb-6 mb-8">
        <div className="text-xs text-zinc-500 mb-1">Historical Purchase Archive &amp; Live Tracking</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900">
          My Orders ({orders.length})
        </h1>
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="You have not placed any orders yet"
          description="Once you place an order, its full tracking timeline and GST invoice will appear here."
          actionLabel="Explore Catalog"
          onAction={() => navigate('/products')}
        />
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-zinc-600 tabular-nums">
                  <span className="font-mono font-semibold text-zinc-900 text-sm">
                    #{order.orderNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Placed on {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Payment: <strong className="text-zinc-900">{order.paymentMethod}</strong> ({order.paymentStatus})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Status: <strong className="text-zinc-900">{order.orderStatus}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-sm font-semibold text-zinc-900">
                    {formatINR(order.pricing.finalTotal)}
                  </span>
                  <Link
                    to={`/orders/${order.id}`}
                    className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 whitespace-nowrap"
                  >
                    Order Details &amp; Invoice
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div className="w-16 h-14 bg-[#F4F3EF] rounded overflow-hidden shrink-0">
                      <ResilientImage
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="font-semibold text-zinc-900 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <div className="text-zinc-500">
                        {item.variantLabel} · Qty: {item.quantity} · {formatINR(item.unitPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshCart, showToast } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered wrong configuration');
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<'Return' | 'Replacement'>('Return');
  const [returnReason, setReturnReason] = useState('Defective or damaged in transit');
  const [returnDesc, setReturnDesc] = useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ order: Order }>(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (err: any) {
      setError(err.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      const res = await apiRequest<{ order: Order }>(`/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      setOrder(res.data.order);
      setCancelModalOpen(false);
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRequestReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      const res = await apiRequest<{ order: Order }>(`/orders/${order.id}/return`, {
        method: 'POST',
        body: JSON.stringify({
          type: returnType,
          reason: returnReason,
          description: returnDesc,
        }),
      });
      setOrder(res.data.order);
      setReturnModalOpen(false);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    try {
      const res = await apiRequest(`/orders/${order.id}/reorder`, { method: 'POST' });
      await refreshCart();
      showToast(res.message, 'success');
      navigate('/cart');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenInvoice = async () => {
    if (!order) return;
    try {
      const res = await apiRequest<{ invoice: any }>(`/orders/${order.id}/invoice`);
      setInvoice(res.data.invoice);
      setInvoiceModalOpen(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <ErrorState message={error || 'Order not found'} onRetry={loadOrder} />
      </div>
    );
  }

  const canCancel = ['Pending', 'Confirmed', 'Processing'].includes(order.orderStatus);
  const canReturn = order.orderStatus === 'Delivered';

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-10">
      {/* Header & Actions */}
      <div className="border-b border-zinc-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/orders" className="text-xs text-zinc-500 hover:text-zinc-900">
            ← Back to My Orders
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 mt-1">
            Order #{order.orderNumber}
          </h1>
          <div className="text-xs text-zinc-600 mt-1 tabular-nums">
            Invoice: <span className="font-mono">{order.invoiceNumber}</span> · Placed{' '}
            {new Date(order.createdAt).toLocaleString('en-IN')} · Status:{' '}
            <strong className="text-zinc-900">{order.orderStatus}</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenInvoice}
            className="px-4 py-2 text-xs font-semibold bg-white border border-zinc-300 text-zinc-900 rounded-md hover:bg-zinc-50 inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tax Invoice</span>
          </button>

          <button
            type="button"
            onClick={handleReorder}
            className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reorder Items</span>
          </button>

          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          )}

          {canReturn && (
            <button
              type="button"
              onClick={() => setReturnModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-amber-700 text-white rounded-md hover:bg-amber-800 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Request Return / Replacement</span>
            </button>
          )}
        </div>
      </div>

      {/* Refund / Return Banner if applicable */}
      {order.refundDetails && order.refundDetails.status !== 'None' && (
        <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1 tabular-nums">
          <div className="font-semibold text-emerald-950 text-sm">
            Refund Status: {order.refundDetails.status} — {formatINR(order.refundDetails.amount)}
          </div>
          <div className="text-emerald-800">
            Reason: {order.refundDetails.reason} · Gateway Reference:{' '}
            <span className="font-mono">{order.refundDetails.providerReference}</span>
          </div>
        </div>
      )}

      {order.returnRequest && (
        <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
          <div className="font-semibold text-amber-950 text-sm">
            {order.returnRequest.type} Request ({order.returnRequest.status})
          </div>
          <div className="text-amber-800">
            Reason: {order.returnRequest.reason} — {order.returnRequest.description}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Items & Tracking Timeline */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 font-display text-xl font-semibold text-zinc-900">
              Purchased Instruments (Historical Price Snapshot)
            </div>
            <div className="divide-y divide-zinc-200">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-16 bg-[#F4F3EF] rounded overflow-hidden shrink-0">
                      <ResilientImage
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="text-zinc-500">
                        {item.brand} · <span className="font-mono">SKU: {item.sku}</span>
                      </div>
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="text-sm font-semibold text-zinc-900 hover:underline block"
                      >
                        {item.productName}
                      </Link>
                      <div className="text-zinc-600">
                        {item.variantLabel} · Qty: {item.quantity} × {formatINR(item.unitPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 tabular-nums">
                    {formatINR(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Tracking Timeline */}
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Fulfillment &amp; Status History
            </h2>
            <div className="space-y-4">
              {order.timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 text-zinc-900">
                    {idx === order.timeline.length - 1 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-900">{event.status}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-500 tabular-nums">
                        {new Date(event.timestamp).toLocaleString('en-IN')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-500">{event.updatedBy}</span>
                    </div>
                    <p className="text-zinc-600 mt-0.5">{event.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Address Snapshot & Financial Breakdown */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-3 text-xs">
            <h3 className="font-display text-xl font-semibold text-zinc-900">
              Delivery Address Snapshot
            </h3>
            <div className="text-zinc-700 leading-relaxed">
              <strong className="text-zinc-900">{order.shippingAddress.name}</strong> (
              {order.shippingAddress.type})
              <br />
              {order.shippingAddress.house}, {order.shippingAddress.street}
              <br />
              {order.shippingAddress.area}, {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
              <span className="font-mono font-semibold">{order.shippingAddress.pincode}</span>
              <br />
              Phone: {order.shippingAddress.phone}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-3 text-xs tabular-nums">
            <h3 className="font-display text-xl font-semibold text-zinc-900">
              Financial Summary
            </h3>
            <div className="flex justify-between text-zinc-600">
              <span>Original MRP Subtotal</span>
              <span>{formatINR(order.pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Product Discount</span>
              <span>− {formatINR(order.pricing.productDiscount)}</span>
            </div>
            {order.pricing.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon ({order.pricing.couponCode})</span>
                <span>− {formatINR(order.pricing.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>{order.pricing.deliveryMethod} Delivery</span>
              <span>
                {order.pricing.deliveryFee === 0
                  ? 'Complimentary'
                  : formatINR(order.pricing.deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>GST ({order.pricing.taxRate}%)</span>
              <span>+ {formatINR(order.pricing.taxAmount)}</span>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex justify-between text-base font-semibold text-zinc-900">
              <span>Total</span>
              <span>{formatINR(order.pricing.finalTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Order #${order.orderNumber}`}
      >
        <form onSubmit={handleCancelOrder} className="space-y-4 text-xs">
          <p className="text-zinc-600">
            Cancelling this order will immediately restore reserved stock and initiate an automatic gateway refund if paid online.
          </p>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Reason for Cancellation</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
            >
              <option value="Ordered wrong configuration">Ordered wrong configuration</option>
              <option value="Found better delivery timeline">Found better delivery timeline</option>
              <option value="Changed mind on purchase">Changed mind on purchase</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 border border-zinc-300 rounded-md"
            >
              Keep Order
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      </Modal>

      {/* Return / Replacement Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title={`Return or Replacement — #${order.orderNumber}`}
      >
        <form onSubmit={handleRequestReturn} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Request Type</label>
            <select
              value={returnType}
              onChange={(e) => setReturnType(e.target.value as 'Return' | 'Replacement')}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
            >
              <option value="Return">Return for Full Refund</option>
              <option value="Replacement">Exact Unit Replacement</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Primary Reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
            >
              <option value="Defective or damaged in transit">Defective or damaged in transit</option>
              <option value="Specification mismatch">Specification mismatch</option>
              <option value="Missing accessories">Missing accessories</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Detailed Notes</label>
            <textarea
              rows={3}
              required
              value={returnDesc}
              onChange={(e) => setReturnDesc(e.target.value)}
              placeholder="Describe the issue for our inspection team..."
              className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReturnModalOpen(false)}
              className="px-4 py-2 border border-zinc-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-md"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Professional GST Tax Invoice Modal */}
      <Modal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={`GST Tax Invoice — ${order.invoiceNumber}`}
        maxWidth="max-w-3xl"
      >
        {invoice && (
          <div className="space-y-6 text-xs text-zinc-800">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="font-display text-2xl font-semibold text-zinc-900">
                  {invoice.seller.legalName}
                </div>
                <div className="text-zinc-500">{invoice.seller.address}</div>
                <div className="font-mono text-zinc-700 mt-1">GSTIN: {invoice.seller.gstin}</div>
              </div>
              <div className="text-right tabular-nums">
                <div className="font-mono font-semibold text-sm">{invoice.invoiceNumber}</div>
                <div className="text-zinc-500">Order: #{invoice.orderNumber}</div>
                <div className="text-zinc-500">
                  Date: {new Date(invoice.issuedDate).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-[#F8F8F5] p-4 rounded border border-zinc-200">
              <div>
                <div className="font-semibold text-zinc-900 mb-1">Billed &amp; Shipped To</div>
                <div>{invoice.buyer.name}</div>
                <div>{invoice.buyer.email} · {invoice.buyer.phone}</div>
                <div>
                  {invoice.buyer.shippingAddress.house}, {invoice.buyer.shippingAddress.city},{' '}
                  {invoice.buyer.shippingAddress.state} — {invoice.buyer.shippingAddress.pincode}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-zinc-900 mb-1">Payment Settlement</div>
                <div>Method: {invoice.payment.method}</div>
                <div>Status: {invoice.payment.status}</div>
                <div className="font-mono">Ref: {invoice.payment.reference}</div>
              </div>
            </div>

            <table className="w-full border-collapse border border-zinc-200 tabular-nums">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-200 text-left">
                  <th className="p-2.5">Instrument &amp; SKU</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Unit Price</th>
                  <th className="p-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {invoice.items.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2.5">
                      <div className="font-semibold text-zinc-900">{it.productName}</div>
                      <div className="text-zinc-500 font-mono">{it.sku}</div>
                    </td>
                    <td className="p-2.5 text-right">{it.quantity}</td>
                    <td className="p-2.5 text-right">{formatINR(it.unitPrice)}</td>
                    <td className="p-2.5 text-right font-semibold">{formatINR(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-md inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF Invoice</span>
              </button>

              <div className="w-64 space-y-1.5 tabular-nums text-right">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Discounted Subtotal:</span>
                  <span>{formatINR(invoice.pricing.subtotal - invoice.pricing.productDiscount)}</span>
                </div>
                {invoice.pricing.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({invoice.pricing.couponCode}):</span>
                    <span>− {formatINR(invoice.pricing.couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">GST (18%):</span>
                  <span>{formatINR(invoice.pricing.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Delivery:</span>
                  <span>{formatINR(invoice.pricing.deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm border-t border-zinc-200 pt-1.5 text-zinc-900">
                  <span>Grand Total:</span>
                  <span>{formatINR(invoice.pricing.finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
