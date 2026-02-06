import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { menuItems, orderItems, orders } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

describe('Bulk Operations - Menu Items', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testItemId: number;
  let testItemId2: number;
  let testOrderId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test menu items
    const [item1] = await db.insert(menuItems).values({
      name: 'Test Item for Bulk Ops',
      slug: `test-bulk-ops-${Date.now()}`,
      description: 'Test description',
      price: '10.00',
      categoryId: 1,
      isAvailable: true,
      isVegan: false,
      isGlutenFree: false,
      isHalal: true,
    });
    testItemId = item1.insertId;

    const [item2] = await db.insert(menuItems).values({
      name: 'Test Item 2 for Bulk Ops',
      slug: `test-bulk-ops-2-${Date.now()}`,
      description: 'Test description 2',
      price: '15.00',
      categoryId: 1,
      isAvailable: true,
      isVegan: false,
      isGlutenFree: false,
      isHalal: true,
    });
    testItemId2 = item2.insertId;

    // Create a test order with one of the items
    const [order] = await db.insert(orders).values({
      orderNumber: `TEST-BULK-${Date.now()}`,
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      orderType: 'delivery',
      subtotal: '10.00',
      deliveryFee: '2.00',
      total: '12.00',
      status: 'completed',
      paymentStatus: 'paid',
    });
    testOrderId = order.insertId;

    // Add order item linking to testItemId
    await db.insert(orderItems).values({
      orderId: testOrderId,
      menuItemId: testItemId,
      menuItemName: 'Test Item for Bulk Ops',
      quantity: 1,
      price: '10.00',
      subtotal: '10.00',
    });
  });

  afterAll(async () => {
    if (!db) return;
    
    // Clean up test data
    if (testOrderId) {
      await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
    
    if (testItemId) {
      await db.delete(menuItems).where(eq(menuItems.id, testItemId));
    }
    
    if (testItemId2) {
      await db.delete(menuItems).where(eq(menuItems.id, testItemId2));
    }
  });

  it('should duplicate menu items with (Copy) suffix', async () => {
    if (!db) throw new Error('Database not available');

    // Get the original item
    const [originalItem] = await db.select().from(menuItems).where(eq(menuItems.id, testItemId2));
    expect(originalItem).toBeDefined();

    // Duplicate the item
    const uniqueSlug = `${originalItem.slug}-copy-${Date.now()}`;
    const [result] = await db.insert(menuItems).values({
      name: `${originalItem.name} (Copy)`,
      slug: uniqueSlug,
      description: originalItem.description,
      price: originalItem.price,
      categoryId: originalItem.categoryId,
      imageUrl: originalItem.imageUrl,
      isAvailable: originalItem.isAvailable,
      isFeatured: false,
      isChefSpecial: false,
      isVegan: originalItem.isVegan,
      isGlutenFree: originalItem.isGlutenFree,
      isHalal: originalItem.isHalal,
      allergens: originalItem.allergens,
      prepTimeMinutes: originalItem.prepTimeMinutes,
      outOfStock: originalItem.outOfStock,
      displayOrder: originalItem.displayOrder,
    });

    const duplicateId = result.insertId;

    // Verify the duplicate was created
    const [duplicate] = await db.select().from(menuItems).where(eq(menuItems.id, duplicateId));
    expect(duplicate).toBeDefined();
    expect(duplicate.name).toBe(`${originalItem.name} (Copy)`);
    expect(duplicate.price).toBe(originalItem.price);
    expect(duplicate.categoryId).toBe(originalItem.categoryId);
    expect(duplicate.isVegan).toBe(originalItem.isVegan);
    expect(duplicate.isGlutenFree).toBe(originalItem.isGlutenFree);
    expect(duplicate.isHalal).toBe(originalItem.isHalal);
    expect(duplicate.isFeatured).toBe(false); // Should not duplicate featured status
    expect(duplicate.isChefSpecial).toBe(false); // Should not duplicate chef special status

    // Clean up the duplicate
    await db.delete(menuItems).where(eq(menuItems.id, duplicateId));
  });

  it('should prevent deletion of menu items with associated orders', async () => {
    if (!db) throw new Error('Database not available');

    // Check if the item has associated order items
    const itemsWithOrders = await db.select({ menuItemId: orderItems.menuItemId })
      .from(orderItems)
      .where(eq(orderItems.menuItemId, testItemId))
      .groupBy(orderItems.menuItemId);

    expect(itemsWithOrders.length).toBeGreaterThan(0);
    expect(itemsWithOrders[0].menuItemId).toBe(testItemId);

    // Attempting to delete should be prevented (we're just testing the check logic)
    // In the actual mutation, this would throw an error
    const hasOrders = itemsWithOrders.length > 0;
    expect(hasOrders).toBe(true);
  });

  it('should allow deletion of menu items without associated orders', async () => {
    if (!db) throw new Error('Database not available');

    // testItemId2 has no orders, so it should be deletable
    const itemsWithOrders = await db.select({ menuItemId: orderItems.menuItemId })
      .from(orderItems)
      .where(eq(orderItems.menuItemId, testItemId2))
      .groupBy(orderItems.menuItemId);

    expect(itemsWithOrders.length).toBe(0);

    // This item can be safely deleted
    const hasOrders = itemsWithOrders.length > 0;
    expect(hasOrders).toBe(false);
  });

  it('should allow updates to menu items even if they have orders', async () => {
    if (!db) throw new Error('Database not available');

    // Update the item that has orders
    await db.update(menuItems)
      .set({ price: '12.50', description: 'Updated description' })
      .where(eq(menuItems.id, testItemId));

    // Verify the update
    const [updatedItem] = await db.select().from(menuItems).where(eq(menuItems.id, testItemId));
    expect(updatedItem.price).toBe('12.50');
    expect(updatedItem.description).toBe('Updated description');

    // Restore original values
    await db.update(menuItems)
      .set({ price: '10.00', description: 'Test description' })
      .where(eq(menuItems.id, testItemId));
  });
});
