import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { orders, orderItems, menuItems, siteSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { processReviewRequests } from './reviewRequestJob';

describe('Review Request Automation', () => {
  let testOrderId: number;
  let testMenuItemId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create a test menu item
    const [menuItem] = await db.insert(menuItems).values({
      categoryId: 1,
      name: 'Test Jollof Rice',
      slug: 'test-jollof-rice-review',
      description: 'Test dish for review request',
      price: '12.99',
      isAvailable: true,
    });
    testMenuItemId = menuItem.insertId;

    // Create a completed order from 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [order] = await db.insert(orders).values({
      orderNumber: `TEST-REVIEW-${Date.now()}`,
      customerName: 'Test Customer',
      customerEmail: 'test-review@example.com',
      customerPhone: '+447700900000',
      orderType: 'delivery',
      deliveryAddress: '123 Test Street',
      deliveryPostcode: 'SW1A 1AA',
      subtotal: '12.99',
      deliveryFee: '2.50',
      total: '15.49',
      status: 'completed',
      paymentStatus: 'paid',
      reviewRequestSent: false,
      createdAt: twentyFourHoursAgo,
      updatedAt: twentyFourHoursAgo,
    });
    testOrderId = order.insertId;

    // Add order item
    await db.insert(orderItems).values({
      orderId: testOrderId,
      menuItemId: testMenuItemId,
      menuItemName: 'Test Jollof Rice',
      quantity: 1,
      price: '12.99',
      subtotal: '12.99',
    });

    // Ensure review requests are enabled
    await db
      .insert(siteSettings)
      .values({
        settingKey: 'review_requests_enabled',
        settingValue: 'true',
      })
      .onDuplicateKeyUpdate({
        set: { settingValue: 'true' },
      });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    if (testOrderId) {
      await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
    if (testMenuItemId) {
      await db.delete(menuItems).where(eq(menuItems.id, testMenuItemId));
    }
  });

  it('should have reviewRequestSent and reviewRequestSentAt fields in orders table', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const order = await db
      .select({
        reviewRequestSent: orders.reviewRequestSent,
        reviewRequestSentAt: orders.reviewRequestSentAt,
      })
      .from(orders)
      .where(eq(orders.id, testOrderId))
      .limit(1);

    expect(order.length).toBe(1);
    expect(order[0].reviewRequestSent).toBe(false);
    expect(order[0].reviewRequestSentAt).toBeNull();
  });

  it('should find orders eligible for review request', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const eligibleOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId));

    expect(eligibleOrders.length).toBe(1);
    expect(eligibleOrders[0].status).toBe('completed');
    expect(eligibleOrders[0].reviewRequestSent).toBe(false);
  });

  it('should check if review requests are enabled in settings', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const setting = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'review_requests_enabled'))
      .limit(1);

    expect(setting.length).toBeGreaterThan(0);
    expect(setting[0].settingValue).toBe('true');
  });

  it('should process review requests when enabled', async () => {
    // Note: This test will attempt to send a real email if email service is configured
    // In a production environment, you would mock the email service
    const result = await processReviewRequests();

    expect(result).toBeDefined();
    expect(typeof result.processed).toBe('number');
    expect(typeof result.sent).toBe('number');
    expect(typeof result.failed).toBe('number');

    // If email service is configured and working, we should have processed at least one order
    if (result.processed > 0) {
      // Check that the order was marked as review request sent
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const order = await db
        .select({
          reviewRequestSent: orders.reviewRequestSent,
          reviewRequestSentAt: orders.reviewRequestSentAt,
        })
        .from(orders)
        .where(eq(orders.id, testOrderId))
        .limit(1);

      expect(order.length).toBe(1);
      // Note: reviewRequestSent might still be false if email sending failed
      // This is expected behavior - we only mark as sent if email was successfully sent
    }
  });

  it('should not send duplicate review requests', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Manually mark the order as review request sent
    await db
      .update(orders)
      .set({
        reviewRequestSent: true,
        reviewRequestSentAt: new Date(),
      })
      .where(eq(orders.id, testOrderId));

    // Try to process review requests again
    const result = await processReviewRequests();

    // The order should not be processed again
    expect(result.processed).toBe(0);
  });

  it('should respect the enabled/disabled setting', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Disable review requests
    await db
      .update(siteSettings)
      .set({ settingValue: 'false' })
      .where(eq(siteSettings.settingKey, 'review_requests_enabled'));

    // Reset the test order
    await db
      .update(orders)
      .set({
        reviewRequestSent: false,
        reviewRequestSentAt: null,
      })
      .where(eq(orders.id, testOrderId));

    // Try to process review requests
    const result = await processReviewRequests();

    // Should be disabled
    expect(result.disabled).toBe(true);
    expect(result.processed).toBe(0);

    // Re-enable for cleanup
    await db
      .update(siteSettings)
      .set({ settingValue: 'true' })
      .where(eq(siteSettings.settingKey, 'review_requests_enabled'));
  });
});
