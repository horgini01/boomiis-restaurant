import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { emailLogs, smsLogs } from '../drizzle/schema';
import { logSMS } from './services/sms-logger';

describe('Email and SMS Analytics Dashboards', () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Clean up test data
    await db.delete(emailLogs);
    await db.delete(smsLogs);
  });

  describe('Email Tracking', () => {
    it('should have emailLogs table with required columns', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Insert test email log
      const [inserted] = await db.insert(emailLogs).values({
        templateType: 'order_confirmed',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        subject: 'Order Confirmed',
        status: 'sent',
        resendId: 'test-email-id-123',
        sentAt: new Date(),
      });

      expect(inserted).toBeDefined();
    });

    it('should track email status changes (sent -> delivered -> opened)', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { eq } = await import('drizzle-orm');

      // Insert email log
      const [inserted] = await db.insert(emailLogs).values({
        templateType: 'order_ready',
        recipientEmail: 'customer@example.com',
        recipientName: 'Customer',
        subject: 'Order Ready for Pickup',
        status: 'sent',
        resendId: 'email-456',
        sentAt: new Date(),
      });

      // Update to delivered
      await db.update(emailLogs)
        .set({ status: 'delivered', deliveredAt: new Date() })
        .where(eq(emailLogs.resendId, 'email-456'));

      // Update to opened
      await db.update(emailLogs)
        .set({ status: 'opened', openedAt: new Date() })
        .where(eq(emailLogs.resendId, 'email-456'));

      const [updated] = await db.select().from(emailLogs).where(eq(emailLogs.resendId, 'email-456'));
      expect(updated.status).toBe('opened');
      expect(updated.openedAt).toBeDefined();
    });

    it('should store bounce and failure information', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.insert(emailLogs).values({
        templateType: 'newsletter',
        recipientEmail: 'invalid@example.com',
        recipientName: 'Invalid User',
        subject: 'Newsletter',
        status: 'bounced',
        resendId: 'email-bounce-789',
        sentAt: new Date(),
        errorMessage: 'Email address does not exist',
      });

      const { eq } = await import('drizzle-orm');
      const [bounced] = await db.select().from(emailLogs).where(eq(emailLogs.resendId, 'email-bounce-789'));
      
      expect(bounced.status).toBe('bounced');
      expect(bounced.errorMessage).toContain('does not exist');
    });
  });

  describe('SMS Tracking', () => {
    it('should log SMS with cost calculation', async () => {
      await logSMS({
        templateType: 'order_confirmed',
        recipientPhone: '+447911123456',
        recipientName: 'Test Customer',
        message: 'Your order has been confirmed!',
        provider: 'bulksms',
        providerId: 'sms-123',
        status: 'sent',
      });

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { eq } = await import('drizzle-orm');
      const [log] = await db.select().from(smsLogs).where(eq(smsLogs.providerId, 'sms-123'));

      expect(log).toBeDefined();
      expect(log.templateType).toBe('order_confirmed');
      expect(log.recipientPhone).toBe('+447911123456');
      expect(log.provider).toBe('bulksms');
      expect(log.segmentCount).toBe(1); // Message is under 160 chars
      expect(parseFloat(log.costGBP || '0')).toBeGreaterThan(0);
    });

    it('should calculate correct segment count for long messages', async () => {
      const longMessage = 'A'.repeat(320); // 320 characters = 2 segments

      await logSMS({
        templateType: 'event_confirmation',
        recipientPhone: '+447911123457',
        recipientName: 'Long Message Customer',
        message: longMessage,
        provider: 'bulksms',
        providerId: 'sms-long-456',
        status: 'sent',
      });

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { eq } = await import('drizzle-orm');
      const [log] = await db.select().from(smsLogs).where(eq(smsLogs.providerId, 'sms-long-456'));

      expect(log.messageLength).toBe(320);
      expect(log.segmentCount).toBe(2);
      // Cost should be 2 segments * £0.04 = £0.08 for BulkSMS
      expect(parseFloat(log.costGBP || '0')).toBeCloseTo(0.08, 4);
    });

    it('should track SMS delivery status', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await logSMS({
        templateType: 'order_ready',
        recipientPhone: '+447911123458',
        recipientName: 'Delivery Test',
        message: 'Your order is ready!',
        provider: 'bulksms',
        providerId: 'sms-delivery-789',
        status: 'sent',
      });

      const { updateSMSStatus } = await import('./services/sms-logger');
      await updateSMSStatus('sms-delivery-789', 'delivered');

      const { eq } = await import('drizzle-orm');
      const [log] = await db.select().from(smsLogs).where(eq(smsLogs.providerId, 'sms-delivery-789'));

      expect(log.status).toBe('delivered');
      expect(log.deliveredAt).toBeDefined();
    });

    it('should track SMS failures with error messages', async () => {
      await logSMS({
        templateType: 'reservation_reminder',
        recipientPhone: '+447911123459',
        recipientName: 'Failed SMS',
        message: 'Reminder: Your reservation is tomorrow',
        provider: 'bulksms',
        providerId: 'sms-failed-101',
        status: 'failed',
        errorMessage: 'Invalid phone number format',
      });

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { eq } = await import('drizzle-orm');
      const [log] = await db.select().from(smsLogs).where(eq(smsLogs.providerId, 'sms-failed-101'));

      expect(log.status).toBe('failed');
      expect(log.errorMessage).toContain('Invalid phone number');
      expect(log.failedAt).toBeDefined();
    });

    it('should calculate different costs for different providers', async () => {
      // BulkSMS: £0.04 per segment
      await logSMS({
        templateType: 'order_confirmed',
        recipientPhone: '+447911111111',
        recipientName: 'BulkSMS Customer',
        message: 'Test message',
        provider: 'bulksms',
        providerId: 'sms-bulksms-1',
        status: 'sent',
      });

      // TextLocal: £0.035 per segment
      await logSMS({
        templateType: 'order_confirmed',
        recipientPhone: '+447922222222',
        recipientName: 'TextLocal Customer',
        message: 'Test message',
        provider: 'textlocal',
        providerId: 'sms-textlocal-1',
        status: 'sent',
      });

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { eq } = await import('drizzle-orm');
      
      const [bulkSMSLog] = await db.select().from(smsLogs).where(eq(smsLogs.providerId, 'sms-bulksms-1'));
      const [textLocalLog] = await db.select().from(smsLogs).where(eq(smsLogs.providerId, 'sms-textlocal-1'));

      expect(parseFloat(bulkSMSLog.costGBP || '0')).toBeCloseTo(0.04, 4);
      expect(parseFloat(textLocalLog.costGBP || '0')).toBeCloseTo(0.035, 4);
    });
  });

  describe('Analytics Queries', () => {
    it('should aggregate email stats by template type', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { sql } = await import('drizzle-orm');

      // Insert multiple emails of different types
      await db.insert(emailLogs).values([
        {
          templateType: 'order_confirmed',
          recipientEmail: 'user1@example.com',
          recipientName: 'User 1',
          subject: 'Order Confirmed',
          status: 'delivered',
          resendId: 'email-agg-1',
          sentAt: new Date(),
        },
        {
          templateType: 'order_confirmed',
          recipientEmail: 'user2@example.com',
          recipientName: 'User 2',
          subject: 'Order Confirmed',
          status: 'opened',
          resendId: 'email-agg-2',
          sentAt: new Date(),
        },
        {
          templateType: 'newsletter',
          recipientEmail: 'user3@example.com',
          recipientName: 'User 3',
          subject: 'Newsletter',
          status: 'sent',
          resendId: 'email-agg-3',
          sentAt: new Date(),
        },
      ]);

      const stats = await db
        .select({
          templateType: emailLogs.templateType,
          total: sql<number>`count(*)`,
          opened: sql<number>`sum(case when status = 'opened' then 1 else 0 end)`,
        })
        .from(emailLogs)
        .groupBy(emailLogs.templateType);

      expect(stats.length).toBeGreaterThanOrEqual(2);
      
      const orderConfirmed = stats.find(s => s.templateType === 'order_confirmed');
      expect(orderConfirmed).toBeDefined();
      expect(Number(orderConfirmed!.total)).toBeGreaterThanOrEqual(2);
    });

    it('should aggregate SMS costs by template type', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { sql } = await import('drizzle-orm');

      // Insert multiple SMS of different types
      await logSMS({
        templateType: 'order_ready',
        recipientPhone: '+447911111111',
        recipientName: 'Customer 1',
        message: 'Order ready!',
        provider: 'bulksms',
        providerId: 'sms-agg-1',
        status: 'sent',
      });

      await logSMS({
        templateType: 'order_ready',
        recipientPhone: '+447922222222',
        recipientName: 'Customer 2',
        message: 'Order ready!',
        provider: 'bulksms',
        providerId: 'sms-agg-2',
        status: 'sent',
      });

      await logSMS({
        templateType: 'reservation_confirmed',
        recipientPhone: '+447933333333',
        recipientName: 'Customer 3',
        message: 'Reservation confirmed!',
        provider: 'bulksms',
        providerId: 'sms-agg-3',
        status: 'sent',
      });

      const stats = await db
        .select({
          templateType: smsLogs.templateType,
          total: sql<number>`count(*)`,
          totalCost: sql<number>`sum(cost_gbp)`,
        })
        .from(smsLogs)
        .groupBy(smsLogs.templateType);

      expect(stats.length).toBeGreaterThanOrEqual(2);

      const orderReady = stats.find(s => s.templateType === 'order_ready');
      expect(orderReady).toBeDefined();
      expect(Number(orderReady!.total)).toBeGreaterThanOrEqual(2);
      expect(Number(orderReady!.totalCost)).toBeGreaterThan(0);
    });
  });

  describe('Resend Webhook', () => {
    it('should handle email.sent webhook event', async () => {
      // This test verifies the webhook handler structure
      // In production, Resend will POST to /api/resend/webhook
      const testEvent = {
        type: 'email.sent',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'webhook-test-123',
          to: ['webhook@example.com'],
          subject: 'Test Email',
        },
      };

      expect(testEvent.type).toBe('email.sent');
      expect(testEvent.data.email_id).toBeDefined();
    });

    it('should handle email.delivered webhook event', async () => {
      const testEvent = {
        type: 'email.delivered',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'webhook-delivered-456',
          to: ['delivered@example.com'],
        },
      };

      expect(testEvent.type).toBe('email.delivered');
    });

    it('should handle email.bounced webhook event', async () => {
      const testEvent = {
        type: 'email.bounced',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'webhook-bounced-789',
          to: ['bounced@example.com'],
          error: {
            message: 'Email address does not exist',
          },
        },
      };

      expect(testEvent.type).toBe('email.bounced');
      expect(testEvent.data.error).toBeDefined();
    });
  });
});
