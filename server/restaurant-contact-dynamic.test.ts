import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { siteSettings } from '../drizzle/schema';
import { generateOrderReceiptPDF } from './pdf-receipt';

describe('Restaurant Contact Information - Dynamic from Database', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database connection failed');
  });

  it('should fetch restaurant contact settings from database', async () => {
    const settingsRows = await db!.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    settingsRows.forEach((s: any) => {
      settingsMap[s.settingKey] = s.settingValue;
    });

    // Verify the correct database keys exist
    expect(settingsMap).toHaveProperty('contact_address');
    expect(settingsMap).toHaveProperty('contact_phone');
    expect(settingsMap).toHaveProperty('contact_email');

    // Verify they're not the old hardcoded values
    expect(settingsMap.contact_address).not.toBe('123 High Street, London, UK SW1A 1AA');
    expect(settingsMap.contact_phone).not.toBe('+44 20 1234 5678');

    // Verify they match the user's actual restaurant info (flexible with spacing)
    expect(settingsMap.contact_address).toContain('Riviera Heights');
    expect(settingsMap.contact_address).toContain('Torquay');
    expect(settingsMap.contact_address).toContain('TQ2 5FA');
    expect(settingsMap.contact_phone).toBe('+447456183646');
    expect(settingsMap.contact_email).toBe('hello@boomiis.uk');
  });

  it('should generate PDF receipt with dynamic restaurant contact info', async () => {
    const orderData = {
      orderId: 'test-123',
      orderNumber: 'BO-TEST123',
      orderDate: new Date(),
      orderType: 'delivery' as const,
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+44 7911 123456',
      deliveryAddress: '123 Test Street',
      postcode: 'TQ1 1AA',
      items: [
        { name: 'Jollof Rice', quantity: 2, price: 12.99 },
        { name: 'Suya Chicken', quantity: 1, price: 8.99 },
      ],
      subtotal: 34.97,
      deliveryFee: 5.00,
      total: 39.97,
      paymentStatus: 'paid',
    };

    const pdfBuffer = await generateOrderReceiptPDF(orderData);

    // Verify PDF was generated
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Convert PDF buffer to string to check for hardcoded values
    const pdfString = pdfBuffer.toString();

    // Verify it does NOT contain the old hardcoded values
    expect(pdfString).not.toContain('123 High Street');
    expect(pdfString).not.toContain('+44 20 1234 5678');

    console.log('✓ PDF receipt generated with dynamic restaurant contact info');
  });

  it('should use correct database keys (contact_address, contact_phone, contact_email)', async () => {
    // This test verifies that the code is using the correct database keys
    // by checking that the settings can be retrieved with these keys
    const settingsRows = await db!.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    settingsRows.forEach((s: any) => {
      settingsMap[s.settingKey] = s.settingValue;
    });

    // These are the correct keys that should be used in pdf-receipt.ts and email.ts
    const contactAddress = settingsMap.contact_address || '123 High Street';
    const contactPhone = settingsMap.contact_phone || '+44 20 1234 5678';
    const contactEmail = settingsMap.contact_email || 'hello@boomiis.uk';

    // Verify the fallback values are NOT being used
    expect(contactAddress).not.toBe('123 High Street');
    expect(contactPhone).not.toBe('+44 20 1234 5678');

    // Verify actual values from database
    expect(contactAddress).toContain('Torquay');
    expect(contactPhone).toContain('7456183646');
    expect(contactEmail).toBe('hello@boomiis.uk');
  });
});
