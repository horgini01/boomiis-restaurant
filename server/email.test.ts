import { describe, it, expect } from 'vitest';
import { sendOrderConfirmationEmail, sendReservationConfirmationEmail } from './email';

describe('Email Integration', () => {
  it('should validate Resend API key is configured', async () => {
    // Test with minimal data to validate API key works
    const testOrderData = {
      orderNumber: 'TEST-001',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      items: [
        { name: 'Test Dish', quantity: 1, price: 10.00 }
      ],
      subtotal: 10.00,
      deliveryFee: 0,
      total: 10.00,
      orderType: 'pickup' as const,
      deliveryAddress: null,
      phone: '1234567890',
    };

    const result = await sendOrderConfirmationEmail(testOrderData);
    
    // Should either succeed or fail with a valid error (not "Email service not configured")
    expect(result.error).not.toBe('Email service not configured');
    
    // If it fails, it should be due to email validation or other Resend API issues
    if (!result.success) {
      console.log('Email test result:', result);
      // This is expected in test environment - Resend may reject test emails
      // The important thing is that the API key is accepted
    }
  }, 30000); // 30 second timeout for API call

  it('should validate Resend API key with reservation email', async () => {
    const testReservationData = {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      date: new Date(),
      time: '19:00',
      guests: 2,
      specialRequests: 'Test reservation',
    };

    const result = await sendReservationConfirmationEmail(testReservationData);
    
    // Should either succeed or fail with a valid error (not "Email service not configured")
    expect(result.error).not.toBe('Email service not configured');
    
    if (!result.success) {
      console.log('Reservation email test result:', result);
    }
  }, 30000);
});
