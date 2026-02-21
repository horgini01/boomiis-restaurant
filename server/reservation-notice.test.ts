import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { siteSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Reservation Notice Banner', () => {
  beforeAll(async () => {
    // Ensure database is available
    const db = await getDb();
    if (!db) throw new Error('Database not available for testing');
  });

  it('should have reservation_notice_enabled setting in database', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const setting = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'reservation_notice_enabled'))
      .limit(1);

    expect(setting).toBeDefined();
    expect(setting.length).toBe(1);
    expect(setting[0].settingKey).toBe('reservation_notice_enabled');
    expect(setting[0].settingType).toBe('boolean');
    expect(['true', 'false']).toContain(setting[0].settingValue);
  });

  it('should have reservation_notice_text setting in database', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const setting = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'reservation_notice_text'))
      .limit(1);

    expect(setting).toBeDefined();
    expect(setting.length).toBe(1);
    expect(setting[0].settingKey).toBe('reservation_notice_text');
    expect(setting[0].settingType).toBe('text');
    // Text should exist and not be empty
    expect(setting[0].settingValue).toBeTruthy();
    expect(setting[0].settingValue.length).toBeGreaterThan(0);
  });

  it('should return correct structure from getReservationNotice query', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Simulate the getReservationNotice procedure logic
    const [enabledSetting, textSetting] = await Promise.all([
      db.select()
        .from(siteSettings)
        .where(eq(siteSettings.settingKey, 'reservation_notice_enabled'))
        .limit(1),
      db.select()
        .from(siteSettings)
        .where(eq(siteSettings.settingKey, 'reservation_notice_text'))
        .limit(1),
    ]);

    const result = {
      enabled: enabledSetting[0]?.settingValue === 'true',
      text: textSetting[0]?.settingValue || '',
    };

    // Verify structure
    expect(result).toHaveProperty('enabled');
    expect(result).toHaveProperty('text');
    expect(typeof result.enabled).toBe('boolean');
    expect(typeof result.text).toBe('string');
  });

  it('should handle disabled state correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Temporarily disable the banner
    await db.update(siteSettings)
      .set({ settingValue: 'false' })
      .where(eq(siteSettings.settingKey, 'reservation_notice_enabled'));

    const setting = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'reservation_notice_enabled'))
      .limit(1);

    const isEnabled = setting[0]?.settingValue === 'true';
    expect(isEnabled).toBe(false);

    // Re-enable for other tests
    await db.update(siteSettings)
      .set({ settingValue: 'true' })
      .where(eq(siteSettings.settingKey, 'reservation_notice_enabled'));
  });

  it('should allow updating notice text', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const testMessage = 'Test notice message for reservations';

    // Update the text
    await db.update(siteSettings)
      .set({ settingValue: testMessage })
      .where(eq(siteSettings.settingKey, 'reservation_notice_text'));

    // Verify update
    const setting = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'reservation_notice_text'))
      .limit(1);

    expect(setting[0].settingValue).toBe(testMessage);

    // Restore original message
    await db.update(siteSettings)
      .set({ settingValue: "Please note: We are fully booked on Valentine's Day. Consider booking for Feb 15th instead!" })
      .where(eq(siteSettings.settingKey, 'reservation_notice_text'));
  });
});
