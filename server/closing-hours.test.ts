import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { siteSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Closing Hours Validation', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let originalOpeningTime: string;
  let originalClosingTime: string;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Store original hours
    const settings = await db.select().from(siteSettings);
    originalOpeningTime = settings.find(s => s.settingKey === 'opening_time')?.settingValue || '11:00';
    originalClosingTime = settings.find(s => s.settingKey === 'closing_time')?.settingValue || '22:00';
  });

  afterAll(async () => {
    if (!db) return;
    
    // Restore original hours
    await db.update(siteSettings)
      .set({ settingValue: originalOpeningTime })
      .where(eq(siteSettings.settingKey, 'opening_time'));
    
    await db.update(siteSettings)
      .set({ settingValue: originalClosingTime })
      .where(eq(siteSettings.settingKey, 'closing_time'));
  });

  it('should block orders when restaurant is closed', async () => {
    if (!db) throw new Error('Database not available');

    // Set hours to ensure restaurant is closed now
    const now = new Date();
    const currentHour = now.getHours();
    
    // Set opening time to future hour and closing time to even later
    // Avoid wraparound issues
    let futureHour: number;
    let closingHour: number;
    
    if (currentHour <= 13) {
      // Current time is before 1 PM - set hours to afternoon/evening
      futureHour = currentHour + 2;
      closingHour = currentHour + 8;
    } else {
      // Current time is after 1 PM - set hours to early morning
      futureHour = 2;
      closingHour = 8;
    }
    
    await db.update(siteSettings)
      .set({ settingValue: `${futureHour.toString().padStart(2, '0')}:00` })
      .where(eq(siteSettings.settingKey, 'opening_time'));
    
    await db.update(siteSettings)
      .set({ settingValue: `${closingHour.toString().padStart(2, '0')}:00` })
      .where(eq(siteSettings.settingKey, 'closing_time'));

    // Create a test caller
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Try to create an order - should fail
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
    ).rejects.toThrow(/currently closed/);
  });

  it('should allow orders when restaurant is open', async () => {
    if (!db) throw new Error('Database not available');

    // Set hours to ensure restaurant is open now (using UK timezone)
    const now = new Date();
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const currentHour = ukTime.getHours();
    
    // Set opening time to past hour and closing time to future hour
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
    
    await db.update(siteSettings)
      .set({ settingValue: `${pastHour.toString().padStart(2, '0')}:00` })
      .where(eq(siteSettings.settingKey, 'opening_time'));
    
    await db.update(siteSettings)
      .set({ settingValue: `${futureHour.toString().padStart(2, '0')}:00` })
      .where(eq(siteSettings.settingKey, 'closing_time'));

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
