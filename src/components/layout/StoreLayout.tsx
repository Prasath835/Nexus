import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, Scale, X, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/api';
import { ToastContainer, formatINR } from '../common/UIElements';
import { User } from '../../types';

interface SuggestionItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  image: string;
}

export const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    cart,
    wishlistIds,
    compareIds,
    clearCompare,
    loginWithToken,
    logout,
    showToast,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const activeCartCount = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ suggestions: SuggestionItem[] }>(
          `/products/suggestions?q=${encodeURIComponent(q)}`
        );
        setSuggestions(res.data.suggestions);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleQuickDemoLogin = async (role: 'customer' | 'admin') => {
    try {
      if (role === 'admin') {
        const res = await apiRequest<{ token: string; user: User }>('/auth/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'admin@aethelgard.com', password: 'Admin@123' }),
        });
        await loginWithToken(res.data.token, res.data.user);
        showToast('Signed in as Administrator (Elena Rostova)', 'success');
        navigate('/admin');
      } else {
        const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: 'arjun.mehta@example.com', password: 'Customer@123' }),
        });
        await loginWithToken(res.data.token, res.data.user);
        showToast('Signed in as Customer (Arjun Mehta)', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Demo login failed', 'error');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBF9] text-[#18181B]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/95 backdrop-blur-sm border-b border-zinc-200/80">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to="/"
            className="font-display text-2xl font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            Aethelgard
          </Link>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <Link
              to="/products"
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Catalog
            </Link>
            <Link
              to="/category/architectural-living"
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Living
            </Link>
            <Link
              to="/category/precision-audio-desk"
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Audio
            </Link>
            <Link
              to="/category/horology-carry"
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Horology
            </Link>
            <Link
              to="/wishlist"
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Wishlist ({wishlistIds.length})
            </Link>
          </nav>

          {/* Zone 3: 2 primary actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Toggle product search"
              className="px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 border border-zinc-200 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            <Link
              to="/cart"
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-md hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap tabular-nums"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Bag ({activeCartCount})</span>
            </Link>
          </div>
        </div>

        {/* Expandable Search Bar with Autocomplete Suggestions */}
        {searchOpen && (
          <div ref={searchRef} className="border-t border-zinc-200 bg-white px-6 py-4 shadow-sm">
            <div className="max-w-2xl mx-auto relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search watches, planar headphones, espresso machines, SKU..."
                  className="w-full px-4 py-2.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 whitespace-nowrap"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="mt-2 border border-zinc-200 rounded-md divide-y divide-zinc-100 bg-white">
                  {suggestions.map((item) => (
                    <Link
                      key={item.id}
                      to={`/products/${item.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{item.name}</div>
                        <div className="text-xs text-zinc-500">
                          {item.brand} · {item.category}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-zinc-900 tabular-nums">
                        {formatINR(item.price)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Contextual Account & Utility Sub-bar */}
      <div className="border-b border-zinc-200/60 bg-[#F5F4F0] text-xs text-zinc-600">
        <div className="max-w-[1360px] mx-auto px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span>Complimentary insured white-glove delivery on orders above ₹50,000</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <Link to="/compare" className="hidden sm:inline hover:text-zinc-900 underline underline-offset-2">
              Compare ({compareIds.length}/4)
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-zinc-800 font-medium">
                  {user.name} ({user.role})
                </span>
                <span aria-hidden="true">·</span>
                <Link to="/orders" className="hover:text-zinc-900">
                  My Orders
                </Link>
                <span aria-hidden="true">·</span>
                <Link to="/profile" className="hover:text-zinc-900">
                  Profile &amp; Addresses
                </Link>
                {user.role === 'admin' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link to="/admin" className="font-semibold text-zinc-900 underline underline-offset-2">
                      Admin Console
                    </Link>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-medium text-zinc-900 hover:underline">
                  Sign In
                </Link>
                <span aria-hidden="true">·</span>
                <Link to="/register" className="hover:text-zinc-900">
                  Create Account
                </Link>
                <span aria-hidden="true">·</span>
                <Link to="/admin/login" className="hover:text-zinc-900">
                  Admin Portal
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Product Comparison Sticky Tray */}
      {compareIds.length > 0 && location.pathname !== '/compare' && (
        <div className="fixed bottom-5 left-5 z-40 bg-zinc-900 text-white px-5 py-3 rounded-lg shadow-xl border border-zinc-800 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-zinc-300" />
            <span className="font-medium tabular-nums">
              {compareIds.length} {compareIds.length === 1 ? 'item' : 'items'} in comparison
            </span>
          </div>
          <Link
            to="/compare"
            className="px-3 py-1.5 bg-white text-zinc-900 font-semibold rounded hover:bg-zinc-100 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>Compare Now</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={clearCompare}
            className="text-zinc-400 hover:text-white"
            aria-label="Clear comparison"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <ToastContainer />

      {/* Clean Architectural Footer */}
      <footer className="border-t border-zinc-200 bg-[#F4F3EF] mt-20">
        <div className="max-w-[1360px] mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm">
          <div className="space-y-3">
            <div className="font-display text-2xl font-semibold text-zinc-900">Aethelgard Atelier</div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Curated architectural furniture, precision Swiss &amp; German horology, planar studio audio, and commercial espresso instruments.
            </p>
            <p className="text-xs text-zinc-500">
              ISO 9001 Certified · Direct Atelier Fulfillment
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-900 mb-3">Collections</h4>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li>
                <Link to="/category/architectural-living" className="hover:text-zinc-900">
                  Architectural Living
                </Link>
              </li>
              <li>
                <Link to="/category/precision-audio-desk" className="hover:text-zinc-900">
                  Precision Audio &amp; Desk
                </Link>
              </li>
              <li>
                <Link to="/category/horology-carry" className="hover:text-zinc-900">
                  Horology &amp; Carry
                </Link>
              </li>
              <li>
                <Link to="/category/culinary-architecture" className="hover:text-zinc-900">
                  Culinary Architecture
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-900 mb-3">Client Services</h4>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li>
                <Link to="/orders" className="hover:text-zinc-900">
                  Order Tracking &amp; GST Invoices
                </Link>
              </li>
              <li>
                <Link to="/addresses" className="hover:text-zinc-900">
                  Delivery Address Book
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-zinc-900">
                  Technical Specification Comparison
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="hover:text-zinc-900">
                  Saved Wishlist
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-900 mb-3">Quick Sandbox Role Access</h4>
            <p className="text-xs text-zinc-600 mb-3">
              Instant evaluation sign-in for reviewing customer checkout or protected administrator console:
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('customer')}
                className="px-3.5 py-2 text-xs font-medium bg-white border border-zinc-300 text-zinc-900 rounded-md hover:bg-zinc-50 text-left transition-colors"
              >
                Sign in as Customer (arjun.mehta@example.com)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 text-left transition-colors"
              >
                Sign in as Admin (admin@aethelgard.com)
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200/80 py-5 px-6 text-xs text-zinc-500">
          <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Aethelgard Atelier Private Limited. All rights reserved.</span>
            <span>Coupon Codes: ATELIER10 (10% off) · PRIVATE5000 (₹5,000 off)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
