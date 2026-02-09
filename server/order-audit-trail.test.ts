import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { orders } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Order Audit Trail - Last Updated By Tracking', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database connection failed');
  });

  it('should have lastUpdatedBy and lastUpdatedByName fields in orders table schema', async () => {
    // Verify the schema includes the new audit fields
    const testOrder = {
      orderNumber: 'TEST-AUDIT-001',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+44 7911 123456',
      orderType: 'delivery' as const,
      subtotal: '25.00',
      deliveryFee: '5.00',
      total: '30.00',
      status: 'pending' as const,
      paymentStatus: 'paid' as const,
      lastUpdatedBy: 1,
      lastUpdatedByName: 'Test Admin',
    };

    // Insert test order
    const [insertResult] = await db!.insert(orders).values(testOrder);
    const orderId = insertResult.insertId;

    // Retrieve and verify
    const [retrievedOrder] = await db!.select().from(orders).where(eq(orders.id, orderId));
    
    expect(retrievedOrder).toBeDefined();
    expect(retrievedOrder.lastUpdatedBy).toBe(1);
    expect(retrievedOrder.lastUpdatedByName).toBe('Test Admin');

    // Clean up
    await db!.delete(orders).where(eq(orders.id, orderId));
  });

  it('should allow null values for lastUpdatedBy fields (for orders created before feature)', async () => {
    // Test that existing orders without audit data don't break
    const testOrder = {
      orderNumber: 'TEST-AUDIT-002',
      customerName: 'Test Customer 2',
      customerEmail: 'test2@example.com',
      customerPhone: '+44 7911 123457',
      orderType: 'pickup' as const,
      subtotal: '15.00',
      deliveryFee: '0.00',
      total: '15.00',
      status: 'pending' as const,
      paymentStatus: 'pending' as const,
      // Intentionally omit lastUpdatedBy and lastUpdatedByName
    };

    const [insertResult] = await db!.insert(orders).values(testOrder);
    const orderId = insertResult.insertId;

    const [retrievedOrder] = await db!.select().from(orders).where(eq(orders.id, orderId));
    
    expect(retrievedOrder).toBeDefined();
    expect(retrievedOrder.lastUpdatedBy).toBeNull();
    expect(retrievedOrder.lastUpdatedByName).toBeNull();

    // Clean up
    await db!.delete(orders).where(eq(orders.id, orderId));
  });

  it('should update lastUpdatedBy fields when order status changes', async () => {
    // Create test order
    const testOrder = {
      orderNumber: 'TEST-AUDIT-003',
      customerName: 'Test Customer 3',
      customerEmail: 'test3@example.com',
      customerPhone: '+44 7911 123458',
      orderType: 'delivery' as const,
      subtotal: '20.00',
      deliveryFee: '5.00',
      total: '25.00',
      status: 'pending' as const,
      paymentStatus: 'paid' as const,
    };

    const [insertResult] = await db!.insert(orders).values(testOrder);
    const orderId = insertResult.insertId;

    // Simulate status update by an admin
    await db!.update(orders).set({
      status: 'confirmed',
      lastUpdatedBy: 2,
      lastUpdatedByName: 'Manager User',
    }).where(eq(orders.id, orderId));

    // Verify update
    const [updatedOrder] = await db!.select().from(orders).where(eq(orders.id, orderId));
    
    expect(updatedOrder.status).toBe('confirmed');
    expect(updatedOrder.lastUpdatedBy).toBe(2);
    expect(updatedOrder.lastUpdatedByName).toBe('Manager User');

    // Simulate another status update by different admin
    await db!.update(orders).set({
      status: 'preparing',
      lastUpdatedBy: 3,
      lastUpdatedByName: 'Kitchen Staff',
    }).where(eq(orders.id, orderId));

    const [finalOrder] = await db!.select().from(orders).where(eq(orders.id, orderId));
    
    expect(finalOrder.status).toBe('preparing');
    expect(finalOrder.lastUpdatedBy).toBe(3);
    expect(finalOrder.lastUpdatedByName).toBe('Kitchen Staff');

    // Clean up
    await db!.delete(orders).where(eq(orders.id, orderId));

    console.log('✓ Order audit trail tracking verified - lastUpdatedBy correctly tracks admin users');
  });

  it('should preserve audit trail through multiple status changes', async () => {
    // Create test order
    const testOrder = {
      orderNumber: 'TEST-AUDIT-004',
      customerName: 'Test Customer 4',
      customerEmail: 'test4@example.com',
      customerPhone: '+44 7911 123459',
      orderType: 'pickup' as const,
      subtotal: '18.00',
      deliveryFee: '0.00',
      total: '18.00',
      status: 'pending' as const,
      paymentStatus: 'paid' as const,
    };

    const [insertResult] = await db!.insert(orders).values(testOrder);
    const orderId = insertResult.insertId;

    // Simulate multiple status changes by different admins
    const statusChanges = [
      { status: 'confirmed', userId: 1, userName: 'Admin One' },
      { status: 'preparing', userId: 2, userName: 'Admin Two' },
      { status: 'ready', userId: 3, userName: 'Admin Three' },
      { status: 'completed', userId: 1, userName: 'Admin One' },
    ];

    for (const change of statusChanges) {
      await db!.update(orders).set({
        status: change.status as any,
        lastUpdatedBy: change.userId,
        lastUpdatedByName: change.userName,
      }).where(eq(orders.id, orderId));

      const [currentOrder] = await db!.select().from(orders).where(eq(orders.id, orderId));
      expect(currentOrder.lastUpdatedBy).toBe(change.userId);
      expect(currentOrder.lastUpdatedByName).toBe(change.userName);
    }

    // Final verification - should show the last admin who made changes
    const [finalOrder] = await db!.select().from(orders).where(eq(orders.id, orderId));
    expect(finalOrder.lastUpdatedBy).toBe(1);
    expect(finalOrder.lastUpdatedByName).toBe('Admin One');

    // Clean up
    await db!.delete(orders).where(eq(orders.id, orderId));

    console.log('✓ Audit trail preserved through multiple status changes by different admins');
  });
});
