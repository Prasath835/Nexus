import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { StoreLayout } from './components/layout/StoreLayout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ComparePage } from './pages/ComparePage';
import { CartPage, WishlistPage } from './pages/CartWishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersListPage, OrderDetailPage } from './pages/OrdersPage';
import {
  LoginPage,
  RegisterPage,
  VerifyOtpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/AuthPages';
import { ProfilePage, AddressesPage } from './pages/AccountPages';
import {
  AdminLoginPage,
  AdminDashboardPage,
  AdminProductsPage,
  AdminProductFormPage,
  AdminCustomersPage,
  AdminOrdersPage,
  AdminCouponsPage,
  AdminReviewsPage,
  AdminQuestionsPage,
} from './pages/admin/AdminPages';

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <StoreLayout>
          <Routes>
            {/* Customer Storefront Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/products" element={<CatalogPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/category/:slug" element={<CatalogPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />

            {/* Protected Admin System Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/new" element={<AdminProductFormPage />} />
            <Route path="/admin/products/:id/edit" element={<AdminProductFormPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:id" element={<AdminOrdersPage />} />
            <Route path="/admin/coupons" element={<AdminCouponsPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
          </Routes>
        </StoreLayout>
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;
