import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api';
import {
  User,
  CartPayload,
  Product,
  AppNotification,
} from '../types';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface BuyNowSelection {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface StoreContextValue {
  user: User | null;
  authLoading: boolean;
  cart: CartPayload | null;
  cartLoading: boolean;
  wishlistIds: string[];
  wishlistProducts: Product[];
  compareIds: string[];
  notifications: AppNotification[];
  toasts: ToastItem[];
  buyNowItem: BuyNowSelection | null;
  setBuyNowItem: (item: BuyNowSelection | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  loginWithToken: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, variantId?: string, quantity?: number) => Promise<boolean>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeCartItem: (itemId: string) => Promise<void>;
  toggleSaveForLater: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  moveWishlistToCart: (productId: string) => Promise<void>;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  markNotificationsRead: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const emptyCart: CartPayload = {
  cartId: '',
  items: [],
  savedForLater: [],
  pricing: {
    subtotal: 0,
    productDiscount: 0,
    discountedSubtotal: 0,
    couponDiscount: 0,
    deliveryFee: 0,
    taxRate: 18,
    taxAmount: 0,
    finalTotal: 0,
  },
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartPayload | null>(emptyCart);
  const [cartLoading, setCartLoading] = useState<boolean>(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_compare');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [buyNowItem, setBuyNowItem] = useState<BuyNowSelection | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshCart = useCallback(async () => {
    if (!getStoredToken()) {
      setCart(emptyCart);
      return;
    }
    try {
      setCartLoading(true);
      const res = await apiRequest<CartPayload>('/cart');
      setCart(res.data);
    } catch {
      setCart(emptyCart);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshWishlistAndNotifications = useCallback(async () => {
    if (!getStoredToken()) {
      setWishlistIds([]);
      setWishlistProducts([]);
      setNotifications([]);
      return;
    }
    try {
      const [wishRes, notifRes] = await Promise.all([
        apiRequest<{ productIds: string[]; products: Product[] }>('/wishlist'),
        apiRequest<{ notifications: AppNotification[] }>('/notifications'),
      ]);
      setWishlistIds(wishRes.data.productIds);
      setWishlistProducts(wishRes.data.products);
      setNotifications(notifRes.data.notifications);
    } catch {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ user: User }>('/auth/me');
      setUser(res.data.user);
      await Promise.all([refreshCart(), refreshWishlistAndNotifications()]);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, [refreshCart, refreshWishlistAndNotifications]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithToken = async (token: string, loggedInUser: User) => {
    setStoredToken(token);
    setUser(loggedInUser);
    await Promise.all([refreshCart(), refreshWishlistAndNotifications()]);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setCart(emptyCart);
    setWishlistIds([]);
    setWishlistProducts([]);
    setNotifications([]);
    showToast('Signed out of your account.', 'info');
  };

  const addToCart = async (productId: string, variantId?: string, quantity = 1): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in to add items to your bag.', 'error');
      return false;
    }
    try {
      const res = await apiRequest<CartPayload>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      setCart(res.data);
      showToast(res.message, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Could not add item to bag.', 'error');
      return false;
    }
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await apiRequest<CartPayload>(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      setCart(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to update quantity.', 'error');
    }
  };

  const removeCartItem = async (itemId: string) => {
    try {
      const res = await apiRequest<CartPayload>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      setCart(res.data);
      showToast('Item removed from bag.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleSaveForLater = async (itemId: string) => {
    try {
      const res = await apiRequest<CartPayload>(`/cart/items/${itemId}/save-for-later`, {
        method: 'PATCH',
      });
      setCart(res.data);
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    try {
      const res = await apiRequest<CartPayload>('/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCart(res.data);
      showToast(res.message, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      const res = await apiRequest<CartPayload>('/cart/coupon', {
        method: 'DELETE',
      });
      setCart(res.data);
      showToast('Coupon removed.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      showToast('Please sign in to save items to your wishlist.', 'error');
      return;
    }
    try {
      const res = await apiRequest<{ productIds: string[]; products: Product[] }>('/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      setWishlistIds(res.data.productIds);
      setWishlistProducts(res.data.products);
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const moveWishlistToCart = async (productId: string) => {
    try {
      const res = await apiRequest<{ cart: CartPayload; wishlistProductIds: string[] }>(
        `/wishlist/${productId}/move-to-cart`,
        { method: 'POST' }
      );
      setCart(res.data.cart);
      setWishlistIds(res.data.wishlistProductIds);
      setWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleCompare = (productId: string) => {
    setCompareIds((prev) => {
      let next: string[];
      if (prev.includes(productId)) {
        next = prev.filter((id) => id !== productId);
        showToast('Removed from comparison.', 'info');
      } else {
        if (prev.length >= 4) {
          showToast('Maximum 4 products can be compared at once.', 'error');
          return prev;
        }
        next = [...prev, productId];
        showToast('Added to product comparison.', 'info');
      }
      localStorage.setItem('aethelgard_compare', JSON.stringify(next));
      return next;
    });
  };

  const clearCompare = () => {
    setCompareIds([]);
    localStorage.removeItem('aethelgard_compare');
  };

  const markNotificationsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        cart,
        cartLoading,
        wishlistIds,
        wishlistProducts,
        compareIds,
        notifications,
        toasts,
        buyNowItem,
        setBuyNowItem,
        showToast,
        dismissToast,
        loginWithToken,
        logout,
        refreshUser,
        refreshCart,
        addToCart,
        updateCartQuantity,
        removeCartItem,
        toggleSaveForLater,
        applyCoupon,
        removeCoupon,
        toggleWishlist,
        moveWishlistToCart,
        toggleCompare,
        clearCompare,
        markNotificationsRead,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}
