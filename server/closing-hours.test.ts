import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { openingHours } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Closing Hours Validation', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let originalHours: any[] = [];

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Store original hours for all days
    originalHours = await db.select().from(openingHours);
  });

  afterAll(async () => {
    if (!db || originalHours.length === 0) return;
    
    // Restore original hours for all days
    for (const day of originalHours) {
      await db.update(openingHours)
        .set({
          openTime: day.openTime,
          closeTime: day.closeTime,
          isClosed: day.isClosed,
        })
        .where(eq(openingHours.dayOfWeek, day.dayOfWeek));
    }
  });

  it('should block orders when restaurant is closed', async () => {
    if (!db) throw new Error('Database not available');

    // Get current day of week in UK timezone
    const now = new Date();
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const currentDayOfWeek = ukTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Set today as closed
    await db.update(openingHours)
      .set({ isClosed: true })
      .where(eq(openingHours.dayOfWeek, currentDayOfWeek));

    // Create a test caller
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Try to create an order - should fail because restaurant is closed today
    await expect(
      caller.orders.create({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '1234567890',
        orderType: 'delivery',
        deliveryAddress: '123 Test St',
        deliveryPostcode: 'SW1A 1AA',
        items: [
          {
            menuItemId: 1,
            quantity: 1,
            price: 10.99,
          },
        ],
      })
    ).rejects.toThrow(/closed today/);
  });

  it('should allow orders when restaurant is open', async () => {
    if (!db) throw new Error('Database not available');

    // Get current day of week and time in UK timezone
    const now = new Date();
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const currentDayOfWeek = ukTime.getDay();
    const currentHour = ukTime.getHours();
    
    // Set hours to ensure restaurant is open now
    // Avoid wraparound by using hours that don't cross midnight
    let pastHour: number;
    let futureHour: number;
    
    if (currentHour >= 2 && currentHour <= 21) {
      // Safe range - no midnight wraparound
      pastHour = currentHour - 1;
      futureHour = currentHour + 2;
    } else {
      // Near midnight - use midday hours instead
      pastHour = 11;
      futureHour = 23;
      // Skip this test if we're not in the safe range
      if (currentHour < 11 || currentHour >= 23) {
        console.log('Skipping test - current time near midnight boundary');
        return;
      }
    }
    
    // Update today's hours to be open
    await db.update(openingHours)
      .set({
        openTime: `${pastHour.toString().padStart(2, '0')}:00`,
        closeTime: `${futureHour.toString().padStart(2, '0')}:00`,
        isClosed: false,
      })
      .where(eq(openingHours.dayOfWeek, currentDayOfWeek));

    // Create a test caller
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Try to create an order - should succeed
    const result = await caller.orders.create({
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      orderType: 'pickup',
      items: [
        {
          menuItemId: 1,
          quantity: 1,
          price: 10.99,
        },
      ],
    });

    expect(result).toHaveProperty('orderId');
    expect(result).toHaveProperty('orderNumber');
  });
});
