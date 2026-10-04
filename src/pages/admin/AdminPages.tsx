import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  MessageSquare,
  Star,
  Plus,
  Trash2,
  Edit3,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/api';
import {
  Product,
  Category,
  Order,
  Coupon,
  Review,
  Question,
  User,
} from '../../types';
import {
  ResilientImage,
  LoadingSkeleton,
  formatINR,
} from '../../components/common/UIElements';

export const AdminLoginPage: React.FC = () => {
  const { loginWithToken, showToast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@aethelgard.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest<{ token: string; user: User }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await loginWithToken(res.data.token, res.data.user);
      showToast('Administrator session active.', 'success');
      navigate('/admin');
    } catch (err: any) {
      showToast(err.message || 'Admin login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Role-Based Access Control</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">
            Administrator Console
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800"
          >
            {loading ? 'Authenticating...' : 'Enter Admin Console'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center space-y-4">
        <h2 className="font-display text-2xl font-semibold text-zinc-900">
          Administrator Authorization Required
        </h2>
        <p className="text-xs text-zinc-600">
          This route is protected by role-based access control. Please sign in with an administrator account.
        </p>
        <Link
          to="/admin/login"
          className="inline-block px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md"
        >
          Go to Admin Login
        </Link>
      </div>
    );
  }

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/products', label: 'Products & Media', icon: Package },
    { to: '/admin/orders', label: 'Orders & Refunds', icon: ShoppingCart },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/coupons', label: 'Coupons', icon: Tag },
    { to: '/admin/reviews', label: 'Reviews', icon: Star },
    { to: '/admin/questions', label: 'Q&A Desk', icon: MessageSquare },
  ];

  return (
    <div className="min-h-[calc(100vh-110px)] flex flex-col lg:flex-row max-w-[1440px] mx-auto">
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-zinc-200 p-5 flex flex-col justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 px-3 pb-2">
            Admin Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-4 border-t border-zinc-200 space-y-2 text-xs">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 p-6 lg:p-8">{children}</div>
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/admin/dashboard')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      {loading || !data ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-500">Executive Telemetry</div>
              <h1 className="font-display text-3xl font-semibold text-zinc-900">
                Operations Overview
              </h1>
            </div>
            <Link
              to="/admin/products/new"
              className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Product</span>
            </Link>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 tabular-nums">
            {[
              { label: 'Total Revenue', val: formatINR(data.metrics.totalRevenue) },
              { label: 'Total Orders', val: data.metrics.totalOrders },
              { label: 'Pending / Active', val: data.metrics.pendingOrders },
              { label: 'Delivered Orders', val: data.metrics.deliveredOrders },
              { label: 'Total Products', val: data.metrics.totalProducts },
              { label: 'Registered Clients', val: data.metrics.totalCustomers },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-zinc-200 rounded-lg p-4 space-y-1"
              >
                <div className="text-xs text-zinc-500">{stat.label}</div>
                <div className="text-lg font-semibold text-zinc-900">{stat.val}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Recent Orders Table */}
            <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-zinc-900">Recent Orders</h2>
                <Link to="/admin/orders" className="text-xs text-zinc-600 hover:underline">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4">Order #</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data.recentOrders.map((ord: Order) => (
                      <tr key={ord.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4 font-mono font-semibold">
                          <Link to={`/admin/orders/${ord.id}`} className="hover:underline">
                            {ord.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4">{ord.customerName}</td>
                        <td className="py-2.5 px-4 font-medium">{ord.orderStatus}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">
                          {formatINR(ord.pricing.finalTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
              <h2 className="font-semibold text-sm text-zinc-900">
                Low Stock Alerts ({data.lowStockProducts.length})
              </h2>
              <div className="space-y-3 text-xs">
                {data.lowStockProducts.map((p: Product) => (
                  <div
                    key={p.id}
                    className="p-3 border border-amber-200 bg-amber-50/50 rounded-md flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900">{p.name}</div>
                      <div className="text-zinc-500 font-mono">SKU: {p.sku}</div>
                    </div>
                    <span className="font-semibold text-amber-800 tabular-nums whitespace-nowrap">
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export const AdminProductsPage: React.FC = () => {
  const { showToast } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    const res = await apiRequest<{ products: Product[] }>('/admin/products');
    setProducts(res.data.products);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleToggleActive = async (product: Product) => {
    try {
      await apiRequest(`/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      showToast(`Product ${!product.isActive ? 'activated' : 'deactivated'}.`, 'info');
      loadProducts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted.', 'info');
      loadProducts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500">Catalog &amp; Cloudinary Media Inventory</div>
            <h1 className="font-display text-3xl font-semibold text-zinc-900">
              Products ({products.length})
            </h1>
          </div>
          <Link
            to="/admin/products/new"
            className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-12 h-10 bg-[#F4F3EF] rounded overflow-hidden shrink-0">
                        <ResilientImage
                          src={p.images[0]?.url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900">{p.name}</div>
                        <div className="text-zinc-500">{p.brand}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">{p.sku}</td>
                    <td className="py-3 px-4">{p.category}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatINR(p.price)}</td>
                    <td className="py-3 px-4 text-right">{p.stock}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`font-medium underline ${
                          p.isActive ? 'text-emerald-700' : 'text-zinc-400'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-3">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900 font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export const AdminProductFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Architectural Living');
  const [subcategory, setSubcategory] = useState('Lounge Seating');
  const [price, setPrice] = useState('45000');
  const [originalPrice, setOriginalPrice] = useState('52000');
  const [stock, setStock] = useState('15');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('/src/assets/images/product_desk_lamp_1791099692192.jpg');
  const [isFeatured, setIsFeatured] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<{ products: Product[]; categories: Category[] }>('/admin/products').then((res) => {
      setCategories(res.data.categories);
      if (isEdit) {
        const found = res.data.products.find((p) => p.id === id);
        if (found) {
          setName(found.name);
          setBrand(found.brand);
          setSku(found.sku);
          setCategory(found.category);
          setSubcategory(found.subcategory);
          setPrice(String(found.price));
          setOriginalPrice(String(found.originalPrice));
          setStock(String(found.stock));
          setShortDescription(found.shortDescription);
          setDescription(found.description);
          setImageUrl(found.images[0]?.url || '');
          setIsFeatured(found.isFeatured);
        }
      }
    });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name,
        brand,
        sku,
        category,
        subcategory,
        price: Number(price),
        originalPrice: Number(originalPrice),
        stock: Number(stock),
        shortDescription,
        description,
        images: [imageUrl],
        isFeatured,
      };

      if (isEdit) {
        await apiRequest(`/admin/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Product updated.', 'success');
      } else {
        await apiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product created.', 'success');
      }
      navigate('/admin/products');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <Link to="/admin/products" className="text-xs text-zinc-500 hover:text-zinc-900">
            ← Back to Products
          </Link>
          <h1 className="font-display text-3xl font-semibold text-zinc-900 mt-1">
            {isEdit ? 'Edit Product' : 'Create New Product'}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Product Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Brand / Maker</label>
              <input
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">SKU</label>
              <input
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Department</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Selling Price (₹)</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Original MRP (₹)</label>
              <input
                type="number"
                required
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Stock Units</label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Subcategory</label>
              <input
                required
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-800 mb-1">
              Cloudinary Image URL or Data URI
            </label>
            <input
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Short Description</label>
            <input
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Full Engineering Description</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            <span>Feature on Storefront Homepage</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </form>
      </div>
    </AdminShell>
  );
};

export const AdminOrdersPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const res = await apiRequest<{ orders: Order[] }>(
      `/admin/orders?status=${encodeURIComponent(statusFilter)}`
    );
    setOrders(res.data.orders);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await apiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          note: `Order transitioned to ${nextStatus} via Admin Console.`,
        }),
      });
      showToast(`Order status updated to ${nextStatus}.`, 'success');
      loadOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const displayedOrders = id ? orders.filter((o) => o.id === id) : orders;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-zinc-500">Fulfillment, Cancellations, Returns &amp; Refunds</div>
            <h1 className="font-display text-3xl font-semibold text-zinc-900">
              Order Management ({displayedOrders.length})
            </h1>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-zinc-300 rounded-md bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Return Requested">Return Requested</option>
            <option value="Returned">Returned</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-3">
                  <div>
                    <span className="font-mono font-semibold text-sm text-zinc-900">
                      #{ord.orderNumber}
                    </span>{' '}
                    · <span>{ord.customerName}</span> ({ord.customerEmail}) ·{' '}
                    <span className="tabular-nums">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm tabular-nums">
                      {formatINR(ord.pricing.finalTotal)}
                    </span>
                    <select
                      value={ord.orderStatus}
                      onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                      className="px-3 py-1.5 border border-zinc-300 rounded bg-white font-semibold text-zinc-900"
                    >
                      {[
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
                      ].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-zinc-600">
                  <div>
                    <strong className="text-zinc-900">Items:</strong>{' '}
                    {ord.items.map((i) => `${i.productName} (×${i.quantity})`).join(', ')}
                  </div>
                  <div>
                    <strong className="text-zinc-900">Payment:</strong> {ord.paymentMethod} —{' '}
                    {ord.paymentStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export const AdminCustomersPage: React.FC = () => {
  const { showToast } = useStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');

  const loadCustomers = async () => {
    const res = await apiRequest<{ customers: any[] }>(
      `/admin/customers?q=${encodeURIComponent(q)}`
    );
    setCustomers(res.data.customers);
  };

  useEffect(() => {
    loadCustomers();
  }, [q]);

  const handleToggle = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/customers/${id}/toggle-active`, { method: 'PATCH' });
      showToast(res.message, 'info');
      loadCustomers();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold text-zinc-900">
            Customer Directory ({customers.length})
          </h1>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="px-3.5 py-2 text-xs border border-zinc-300 rounded-md bg-white w-64"
          />
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Orders</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4">Account State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-900">{c.name}</div>
                    <div className="text-zinc-500">{c.email}</div>
                  </td>
                  <td className="py-3 px-4">{c.phone}</td>
                  <td className="py-3 px-4 text-right">{c.orderCount}</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatINR(c.totalSpent)}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(c.id)}
                      className={`font-semibold underline ${
                        c.isActive ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {c.isActive ? 'Active (Click to Suspend)' : 'Suspended (Click to Activate)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minPurchase, setMinPurchase] = useState('20000');
  const [maxDiscount, setMaxDiscount] = useState('10000');
  const [usageLimit, setUsageLimit] = useState('100');
  const [expiresAt, setExpiresAt] = useState('2027-12-31');

  const loadCoupons = async () => {
    const res = await apiRequest<{ coupons: Coupon[] }>('/admin/coupons');
    setCoupons(res.data.coupons);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code,
          discountType,
          discountValue: Number(discountValue),
          minPurchase: Number(minPurchase),
          maxDiscount: Number(maxDiscount),
          usageLimit: Number(usageLimit),
          expiresAt,
        }),
      });
      setCode('');
      showToast('Coupon created.', 'success');
      loadCoupons();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggle = async (cpn: Coupon) => {
    try {
      await apiRequest(`/admin/coupons/${cpn.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !cpn.isActive }),
      });
      showToast('Coupon updated.', 'info');
      loadCoupons();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-8">
        <h1 className="font-display text-3xl font-semibold text-zinc-900">
          Promotional Coupons ({coupons.length})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-3">
            {coupons.map((cpn) => (
              <div
                key={cpn.id}
                className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between text-xs tabular-nums"
              >
                <div>
                  <div className="font-mono font-semibold text-sm text-zinc-900">{cpn.code}</div>
                  <div className="text-zinc-600">{cpn.description}</div>
                  <div className="text-zinc-500 mt-1">
                    Min Order: {formatINR(cpn.minPurchase)} · Max Discount: {formatINR(cpn.maxDiscount)} · Used:{' '}
                    {cpn.usedCount}/{cpn.usageLimit}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(cpn)}
                  className={`px-3 py-1.5 rounded border font-semibold ${
                    cpn.isActive
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-zinc-300 bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {cpn.isActive ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreate}
            className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-5 space-y-3 text-xs"
          >
            <h2 className="font-display text-xl font-semibold text-zinc-900">Create Coupon</h2>
            <input
              required
              placeholder="Coupon Code (e.g. COLLECTOR15)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-zinc-300 rounded font-mono uppercase"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'flat')}
                className="px-3 py-2 border border-zinc-300 rounded bg-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
              <input
                type="number"
                required
                placeholder="Value"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min Purchase (₹)"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded"
              />
              <input
                type="number"
                placeholder="Max Discount (₹)"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Usage Limit"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded"
              />
              <input
                type="date"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-zinc-900 text-white font-semibold rounded-md"
            >
              Create Coupon
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
};

export const AdminReviewsPage: React.FC = () => {
  const { showToast } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = async () => {
    const res = await apiRequest<{ reviews: Review[] }>('/admin/reviews');
    setReviews(res.data.reviews);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' });
      showToast('Review moderated and removed.', 'info');
      loadReviews();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold text-zinc-900">
          Review Moderation ({reviews.length})
        </h1>
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-zinc-200 rounded-lg p-5 flex items-start justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="text-zinc-500">
                  <strong>{r.userName}</strong> on <strong>{r.productName}</strong> · {r.rating} Stars ·{' '}
                  {r.verifiedPurchase ? 'Verified Purchase' : 'Unverified'}
                </div>
                <div className="font-semibold text-zinc-900 text-sm">{r.title}</div>
                <p className="text-zinc-600">{r.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                className="px-3 py-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
};

export const AdminQuestionsPage: React.FC = () => {
  const { showToast } = useStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const loadQuestions = async () => {
    const res = await apiRequest<{ questions: Question[] }>('/admin/questions');
    setQuestions(res.data.questions);
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleAnswer = async (id: string) => {
    const answer = drafts[id];
    if (!answer) return;
    try {
      await apiRequest(`/admin/questions/${id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer }),
      });
      showToast('Specialist answer published.', 'success');
      loadQuestions();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold text-zinc-900">
          Customer Technical Questions ({questions.length})
        </h1>
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white border border-zinc-200 rounded-lg p-5 space-y-3 text-xs">
              <div className="text-zinc-500">
                Product: <strong className="text-zinc-900">{q.productName}</strong> · Asked by{' '}
                {q.userName}
              </div>
              <div className="text-sm font-semibold text-zinc-900">Q: {q.question}</div>
              {q.answer && (
                <div className="p-3 bg-[#F8F8F5] border-l-2 border-zinc-900 text-zinc-700">
                  Current Answer: {q.answer}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={drafts[q.id] ?? q.answer ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                  placeholder="Write or update official technical answer..."
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => handleAnswer(q.id)}
                  className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-md"
                >
                  Publish Answer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
};
