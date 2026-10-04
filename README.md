# Aethelgard Atelier — Full-Stack E-Commerce Platform

A production-grade full-stack e-commerce web application engineered with React, Vite, Tailwind CSS, Node.js, Express, MongoDB Atlas (Mongoose), JWT Role-Based Access Control, Cloudinary Media Management, and an isolated Sandbox Payment Gateway service layer.

---

## 1. Architecture Overview

```text
GitHub Repository
        |
        +-----------------------+
        |                       |
        v                       v
Render Static Site       Render Web Service
Frontend                 Backend API
React + Vite             Node + Express
        |                       |
        +----------API----------+
                    |
                    v
              MongoDB Atlas
                    |
                    v
                Cloudinary
```

### Core Engineering Principles
- **Authoritative Backend Pricing & Tax**: The client browser is never trusted for product prices, variant stock, coupon discounts, delivery fees, or 18% GST calculations. `server/services/pricingService.ts` recomputes all values on the server prior to payment order initialization and order creation.
- **Payment Gateway Abstraction**: `server/services/paymentService.ts` isolates payment provider logic, generating backend payment orders and verifying HMAC-SHA256 signatures before marking online transactions (`Card`, `UPI`, `NetBanking`, `Wallet`) as `Paid`. Raw card numbers and CVVs are strictly rejected.
- **Verified Purchase Integrity**: `server/controllers/catalogController.ts` determines `verifiedPurchase` exclusively on the backend by checking delivered historical orders for the authenticated customer.
- **Historical Order Immutability**: Orders embed complete line-item price, SKU, variant, and shipping address snapshots at purchase time so subsequent catalog edits never alter historical orders or GST tax invoices.

---

## 2. Default Sandbox Accounts & Coupons

- **Customer Account**: `arjun.mehta@example.com` / `Customer@123`
- **Administrator Account**: `admin@aethelgard.com` / `Admin@123`
- **Active Collector Coupons**:
  - `ATELIER10` — 10% off orders above ₹25,000 (up to ₹15,000 maximum discount)
  - `PRIVATE5000` — Flat ₹5,000 off orders above ₹75,000

---

## 3. Render Deployment Guide

This repository includes a blueprint `render.yaml` and is configured specifically for **Render** (Render Static Site for the React/Vite SPA + Render Web Service for the Node/Express API).

### A. Deploying the Backend API (Render Web Service)
1. In the Render Dashboard, click **New +** → **Web Service** and connect your GitHub repository.
2. Configure the service settings:
   - **Runtime**: `Node`
   - **Root Directory**: `.` (or `server` if deploying split directories)
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `npm run start:server`
   - **Health Check Path**: `/api/health`
3. Bindings: The Express server listens on `process.env.PORT` and binds to `0.0.0.0`.
4. Configure the following Environment Variables in Render:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `mongodb+srv://<user>:<password>@cluster.mongodb.net/aethelgard`
   - `JWT_SECRET` = `<64-character-random-hex-secret>`
   - `JWT_EXPIRES_IN` = `7d`
   - `CLIENT_URL` = `https://<your-frontend-static-site>.onrender.com`
   - `SERVER_URL` = `https://<your-backend-web-service>.onrender.com`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `PAYMENT_PROVIDER_KEY`, `PAYMENT_PROVIDER_SECRET`, `PAYMENT_WEBHOOK_SECRET`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`

### B. Deploying the Frontend SPA (Render Static Site)
1. In the Render Dashboard, click **New +** → **Static Site** and connect the same GitHub repository.
2. Configure the build settings:
   - **Root Directory**: `.`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add the Frontend Environment Variable:
   - `VITE_API_BASE_URL` = `https://<your-backend-web-service>.onrender.com/api`
4. **React Router SPA Rewrite Rule (Mandatory)**:
   - In your Render Static Site settings, navigate to **Redirects/Rewrites** and add:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
   - This ensures refreshing deep links such as `/products/krono-calibre-09-titanium-chronograph` or `/admin/orders` resolves properly.

---

## 4. Local Development, Seeding & Testing

```bash
# Install dependencies
npm install

# Seed initial admin, customer, categories, products, variants, and coupons
npm run seed

# Start full-stack development server (port 3000)
npm run dev

# Run automated backend integration test suite (Vitest + Supertest)
npm test

# Type-check and build production bundle
npm run lint
npm run build
```
