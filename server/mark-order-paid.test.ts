import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { orders, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

describe('markOrderAsPaid procedure', () => {
  let testAdminUser: any;
  let testOrder: any;
  let caller: any;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Clean up any existing test data
    await db.delete(users).where(eq(users.email, 'test-admin-payment@example.com'));
    await db.delete(orders).where(eq(orders.orderNumber, 'TEST-PAY-001'));
    await db.delete(orders).where(eq(orders.orderNumber, 'TEST-PAY-002'));
    await db.delete(orders).where(eq(orders.orderNumber, 'TEST-PAY-003'));

    // Create test admin user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const uniqueOpenId = `test-admin-payment-${Date.now()}`;
    const [admin] = await db.insert(users).values({
      openId: uniqueOpenId,
      email: 'test-admin-payment@example.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      passwordHash: hashedPassword,
      isSetupComplete: true,
    }).$returningId();

    testAdminUser = {
      id: admin.id,
      email: 'test-admin-payment@example.com',
      name: 'Test Admin',
      role: 'admin',
    };

    // Create test order with pending payment
    const [order] = await db.insert(orders).values({
      orderNumber: 'TEST-PAY-001',
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+447700900000',
      orderType: 'pickup',
      subtotal: '25.00',
      deliveryFee: '0.00',
      total: '25.00',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_pickup',
      items: JSON.stringify([
        { menuItemId: 1, menuItemName: 'Test Item', quantity: 1, price: 25.00 }
      ]),
      timeline: JSON.stringify([
        { status: 'pending', timestamp: new Date().toISOString(), note: 'Order placed - Payment on pickup' }
      ]),
    }).$returningId();

    testOrder = order;

    // Create tRPC caller with admin context
    caller = appRouter.createCaller({
      user: testAdminUser,
      req: { headers: {} } as any,
    });
  });

  it('should mark order as paid with cash payment', async () => {
    const result = await caller.admin.markOrderAsPaid({
      orderId: testOrder.id,
      actualAmountPaid: 25.00,
      paymentMethod: 'cash',
      paymentNotes: 'Customer paid exact amount',
    });

    expect(result.success).toBe(true);

    // Verify order was updated
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, testOrder.id));
    expect(updatedOrder.paymentStatus).toBe('paid');
    expect(updatedOrder.paymentMethod).toBe('cash_on_pickup');
    expect(parseFloat(updatedOrder.actualAmountPaid || '0')).toBe(25.00);
    expect(updatedOrder.paymentNotes).toBe('Customer paid exact amount');
    expect(updatedOrder.paymentReceivedBy).toBe(testAdminUser.id);
    expect(updatedOrder.paymentReceivedAt).toBeTruthy();

    // Verify timeline was updated
    const timeline = JSON.parse(updatedOrder.timeline || '[]');
    const paymentEvent = timeline.find((e: any) => e.status === 'payment_received');
    expect(paymentEvent).toBeTruthy();
    expect(paymentEvent.note).toContain('£25.00');
    expect(paymentEvent.note).toContain('cash');
    expect(paymentEvent.updatedBy).toBe(testAdminUser.email);
  });

  it('should mark order as paid with card payment', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create another test order
    const [order] = await db.insert(orders).values({
      orderNumber: 'TEST-PAY-002',
      customerName: 'Test Customer 2',
      customerEmail: 'customer2@example.com',
      customerPhone: '+447700900001',
      orderType: 'pickup',
      subtotal: '30.00',
      deliveryFee: '0.00',
      total: '30.00',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'card_on_pickup',
      items: JSON.stringify([
        { menuItemId: 1, menuItemName: 'Test Item', quantity: 1, price: 30.00 }
      ]),
      timeline: JSON.stringify([
        { status: 'pending', timestamp: new Date().toISOString(), note: 'Order placed - Payment on pickup' }
      ]),
    }).$returningId();

    const result = await caller.admin.markOrderAsPaid({
      orderId: order.id,
      actualAmountPaid: 30.00,
      paymentMethod: 'card',
    });

    expect(result.success).toBe(true);

    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(updatedOrder.paymentStatus).toBe('paid');
    expect(updatedOrder.paymentMethod).toBe('card_on_pickup');
    expect(parseFloat(updatedOrder.actualAmountPaid || '0')).toBe(30.00);
  });

  it('should allow partial payment with notes', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create another test order
    const [order] = await db.insert(orders).values({
      orderNumber: 'TEST-PAY-003',
      customerName: 'Test Customer 3',
      customerEmail: 'customer3@example.com',
      customerPhone: '+447700900002',
      orderType: 'pickup',
      subtotal: '50.00',
      deliveryFee: '0.00',
      total: '50.00',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_pickup',
      items: JSON.stringify([
        { menuItemId: 1, menuItemName: 'Test Item', quantity: 2, price: 25.00 }
      ]),
      timeline: JSON.stringify([
        { status: 'pending', timestamp: new Date().toISOString(), note: 'Order placed - Payment on pickup' }
      ]),
    }).$returningId();

    const result = await caller.admin.markOrderAsPaid({
      orderId: order.id,
      actualAmountPaid: 45.00, // £5 discount
      paymentMethod: 'cash',
      paymentNotes: 'Applied £5 loyalty discount',
    });

    expect(result.success).toBe(true);

    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(parseFloat(updatedOrder.actualAmountPaid || '0')).toBe(45.00);
    expect(updatedOrder.paymentNotes).toBe('Applied £5 loyalty discount');

    const timeline = JSON.parse(updatedOrder.timeline || '[]');
    const paymentEvent = timeline.find((e: any) => e.status === 'payment_received');
    expect(paymentEvent.note).toContain('£45.00');
    expect(paymentEvent.note).toContain('Applied £5 loyalty discount');
  });

  it('should fail for non-existent order', async () => {
    await expect(
      caller.admin.markOrderAsPaid({
        orderId: 999999,
        actualAmountPaid: 25.00,
        paymentMethod: 'cash',
      })
    ).rejects.toThrow('Order not found');
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(users).where(eq(users.email, 'test-admin-payment@example.com'));
    await db.delete(orders).where(eq(orders.orderNumber, 'TEST-PAY-001'));
    await db.delete(orders).where(eq(orders.orderNumber, 'TEST-PAY-002'));
    await db.delete(orders).where(eq(orders.orderNumber, 'TEST-PAY-003'));
  });
});
