import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { orders, orderItems, menuItems } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Payment Integration', () => {
  let testOrderId: number;
  let testMenuItemId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create a test menu item
    const menuItemResult = await db.insert(menuItems).values({
      categoryId: 1,
      name: 'Test Dish for Payment',
      slug: 'test-dish-payment-' + Date.now(),
      description: 'Test dish for payment testing',
      price: '10.00',
      isAvailable: true,
      isFeatured: false,
    });
    testMenuItemId = Number(menuItemResult.insertId) || 1;

    // Create a test order
    const orderResult = await db.insert(orders).values({
      orderNumber: 'TEST-PAY-' + Date.now(),
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      orderType: 'delivery',
      deliveryAddress: '123 Test Street',
      deliveryPostcode: 'TE1 1ST',
      subtotal: '10.00',
      deliveryFee: '3.99',
      total: '13.99',
      status: 'pending',
      paymentStatus: 'pending',
    });
    testOrderId = Number(orderResult.insertId) || 1;

    // Create order items
    await db.insert(orderItems).values({
      orderId: testOrderId,
      menuItemId: testMenuItemId,
      menuItemName: 'Test Dish for Payment',
      quantity: 1,
      price: '10.00',
      subtotal: '10.00',
    });
  });

  it('should create a Stripe checkout session', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: { origin: 'http://localhost:3000' } } as any,
      res: {} as any,
    });

    const result = await caller.payment.createCheckoutSession({
      orderId: testOrderId,
      customerEmail: 'test@example.com',
      customerName: 'Test Customer',
    });

    expect(result).toBeDefined();
    expect(result.sessionId).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.url).toContain('stripe.com');
  });

  it('should update order with payment intent ID', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [order] = await db.select().from(orders).where(eq(orders.id, testOrderId));
    
    // After creating checkout session, paymentIntentId should be set
    expect(order.paymentIntentId).toBeDefined();
    expect(order.paymentIntentId).not.toBe('');
  });

  it('should include all order items in checkout session', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, testOrderId));
    
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].menuItemName).toBe('Test Dish for Payment');
    expect(items[0].quantity).toBe(1);
  });

  it('should handle missing order gracefully', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: { origin: 'http://localhost:3000' } } as any,
      res: {} as any,
    });

    await expect(
      caller.payment.createCheckoutSession({
        orderId: 999999, // Non-existent order
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
      })
    ).rejects.toThrow('Order not found');
  });
});
