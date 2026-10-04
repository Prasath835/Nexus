import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../app';
import { resetToSeedData } from '../config/db';

const app = createExpressApp();

describe('Aethelgard Full-Stack E-Commerce API Suite', () => {
  let customerToken = '';
  let secondCustomerToken = '';
  let adminToken = '';
  let createdOrderId = '';

  beforeAll(() => {
    resetToSeedData();
  });

  it('1. Health check endpoint responds with 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('2. Registration creates a new customer account with hashed password and OTP', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Rohan Kulkarni',
      email: 'rohan.kulkarni@example.com',
      phone: '+91 98220 11223',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('rohan.kulkarni@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    secondCustomerToken = res.body.data.token;
  });

  it('3. Login authenticates existing customer and returns JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'arjun.mehta@example.com',
      password: 'Customer@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    customerToken = res.body.data.token;
  });

  it('4. Authentication middleware rejects unauthenticated requests and allows valid JWT', async () => {
    const unauth = await request(app).get('/api/auth/me');
    expect(unauth.status).toBe(401);

    const auth = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(auth.status).toBe(200);
    expect(auth.body.data.user.email).toBe('arjun.mehta@example.com');
  });

  it('5. Admin authorization blocks regular customers and permits admin role', async () => {
    const forbidden = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(forbidden.status).toBe(403);

    const adminLoginRes = await request(app).post('/api/auth/admin/login').send({
      email: 'admin@aethelgard.com',
      password: 'Admin@123',
    });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.token;

    const dashboardRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.data.metrics.totalProducts).toBeGreaterThanOrEqual(7);
  });

  it('6. Product creation by admin persists in database and product retrieval succeeds', async () => {
    const createRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bezel Studio Acoustic Desk Mat',
        shortDescription: 'Merino wool felt and vegetable-tanned leather desk architecture.',
        description: '4mm dense German merino wool felt bonded to a natural rubber base.',
        category: 'Precision Audio & Desk',
        subcategory: 'Mechanical Keyboards',
        brand: 'KBD Atelier',
        sku: 'KB-MAT-09',
        price: 8500,
        originalPrice: 9500,
        stock: 25,
      });

    expect(createRes.status).toBe(201);
    const slug = createRes.body.data.product.slug;

    const getRes = await request(app).get(`/api/products/${slug}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.product.sku).toBe('KB-MAT-09');
  });

  it('7. Cart operations add item, validate stock, and calculate server totals', async () => {
    const addRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: 'prod_05',
        variantId: 'var_prod05_1',
        quantity: 1,
      });

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(addRes.body.data.pricing.finalTotal).toBeGreaterThan(0);
  });

  it('8. Coupon validation applies valid code and rejects expired or invalid codes', async () => {
    const invalidRes = await request(app)
      .post('/api/cart/coupon')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'ARCHIVED2024' });
    expect(invalidRes.status).toBe(400);

    const validRes = await request(app)
      .post('/api/cart/coupon')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'ATELIER10' });
    expect(validRes.status).toBe(200);
    expect(validRes.body.data.pricing.couponCode).toBe('ATELIER10');
    expect(validRes.body.data.pricing.couponDiscount).toBeGreaterThan(0);
  });

  it('9. Checkout calculation recomputes authoritative subtotal, coupon, GST, and delivery fee on server', async () => {
    const calcRes = await request(app)
      .post('/api/checkout/calculate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        buyNowItem: {
          productId: 'prod_05',
          variantId: 'var_prod05_1',
          quantity: 1,
        },
        couponCode: 'ATELIER10',
        deliveryMethod: 'Standard',
      });

    expect(calcRes.status).toBe(200);
    const summary = calcRes.body.data.summary;
    // Unit price of prod_05 is 34,500; 10% coupon is 3,450; taxable base is 31,050
    expect(summary.discountedSubtotal).toBe(34500);
    expect(summary.couponDiscount).toBe(3450);
    expect(summary.taxRate).toBe(18);
  });

  it('10. Order creation verifies payment signature and preserves purchase-time pricing', async () => {
    const payInit = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        buyNowItem: {
          productId: 'prod_05',
          variantId: 'var_prod05_1',
          quantity: 1,
        },
        deliveryMethod: 'Standard',
        paymentMethod: 'Card',
      });

    expect(payInit.status).toBe(201);
    const { providerOrderId, sandboxCredentials } = payInit.body.data.gatewayOrder;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: 'addr_01',
        deliveryMethod: 'Standard',
        paymentMethod: 'Card',
        providerOrderId,
        providerPaymentId: sandboxCredentials.providerPaymentId,
        paymentSignature: sandboxCredentials.signature,
        buyNowItem: {
          productId: 'prod_05',
          variantId: 'var_prod05_1',
          quantity: 1,
        },
        idempotencyKey: 'idem_test_001',
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.order.paymentStatus).toBe('Paid');
    createdOrderId = orderRes.body.data.order.id;
  });

  it('11. Order ownership prevents a customer from accessing or cancelling another customer’s order', async () => {
    const otherView = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${secondCustomerToken}`);
    expect(otherView.status).toBe(403);

    const otherCancel = await request(app)
      .post(`/api/orders/${createdOrderId}/cancel`)
      .set('Authorization', `Bearer ${secondCustomerToken}`)
      .send({ reason: 'Unauthorized attempt' });
    expect(otherCancel.status).toBe(403);
  });
});
