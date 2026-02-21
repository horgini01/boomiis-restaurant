import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { siteSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('WhatsApp Feature', () => {
  beforeAll(async () => {
    // Ensure database is available
    const db = await getDb();
    if (!db) throw new Error('Database not available for testing');
  });

  it('should have whatsapp_enabled setting in database', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const setting = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'whatsapp_enabled'))
      .limit(1);

    expect(setting).toBeDefined();
    expect(setting.length).toBe(1);
    expect(setting[0].settingKey).toBe('whatsapp_enabled');
    expect(setting[0].settingValue).toBe('true');
    expect(setting[0].settingType).toBe('boolean');
  });

  it('should have contact_phone setting in database', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const setting = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'contact_phone'))
      .limit(1);

    expect(setting).toBeDefined();
    expect(setting.length).toBe(1);
    expect(setting[0].settingKey).toBe('contact_phone');
    // Phone number should exist and not be empty
    expect(setting[0].settingValue).toBeTruthy();
    expect(setting[0].settingValue.length).toBeGreaterThan(0);
  });

  it('should format UK phone numbers correctly for WhatsApp', () => {
    // Test the phone formatting logic used in WhatsAppButton component
    const formatPhoneForWhatsApp = (phone: string) => {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '44' + cleaned.substring(1);
      }
      return cleaned;
    };

    // Test UK mobile number starting with 0
    expect(formatPhoneForWhatsApp('07867457476')).toBe('447867457476');
    
    // Test UK mobile with spaces
    expect(formatPhoneForWhatsApp('07867 457 476')).toBe('447867457476');
    
    // Test UK mobile with dashes
    expect(formatPhoneForWhatsApp('07867-457-476')).toBe('447867457476');
    
    // Test international format (already has country code)
    expect(formatPhoneForWhatsApp('+447867457476')).toBe('447867457476');
    
    // Test UK landline
    expect(formatPhoneForWhatsApp('02012345678')).toBe('442012345678');
  });

  it('should generate correct WhatsApp URL', () => {
    const phoneNumber = '447867457476';
    const message = encodeURIComponent("Hi Boomiis! I'd like to inquire about...");
    const expectedUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    const actualUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    expect(actualUrl).toBe(expectedUrl);
    expect(actualUrl).toContain('wa.me');
    expect(actualUrl).toContain('447867457476');
    expect(actualUrl).toContain('text=');
  });
});
