import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';

describe('Phase 3 Workflows - Admin SMS and Event/Catering', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let adminUser: any;

  beforeAll(async () => {
    // Create a mock admin user context
    adminUser = {
      id: 1,
      openId: 'test-admin',
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin' as const,
    };

    caller = appRouter.createCaller({
      user: adminUser,
      req: {} as any,
      res: {} as any,
    });
  });

  describe('Admin SMS Notifications', () => {
    it('should have admin SMS functions available in sms.service', async () => {
      const { sendAdminNewOrderSMS, sendAdminWeeklyReportSMS, sendNewsletterConfirmationSMS } = await import('./services/sms.service');
      
      expect(sendAdminNewOrderSMS).toBeDefined();
      expect(typeof sendAdminNewOrderSMS).toBe('function');
      
      expect(sendAdminWeeklyReportSMS).toBeDefined();
      expect(typeof sendAdminWeeklyReportSMS).toBe('function');
      
      expect(sendNewsletterConfirmationSMS).toBeDefined();
      expect(typeof sendNewsletterConfirmationSMS).toBe('function');
    });

    it('should accept newsletter subscription with phone number', async () => {
      const result = await caller.newsletter.subscribe({
        email: `test-${Date.now()}@example.com`,
        name: 'Test Subscriber',
        phone: '+447123456789',
        source: 'homepage',
      });

      expect(result.success).toBe(true);
    });

    it('should accept newsletter subscription without phone number', async () => {
      const result = await caller.newsletter.subscribe({
        email: `test-no-phone-${Date.now()}@example.com`,
        name: 'Test Subscriber No Phone',
        source: 'homepage',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Event Confirmation Workflow', () => {
    it('should have sendEventConfirmationEmail function available', async () => {
      const { sendEventConfirmationEmail } = await import('./email');
      
      expect(sendEventConfirmationEmail).toBeDefined();
      expect(typeof sendEventConfirmationEmail).toBe('function');
    });

    it('should have sendEventConfirmationSMS function available', async () => {
      const { sendEventConfirmationSMS } = await import('./services/sms.service');
      
      expect(sendEventConfirmationSMS).toBeDefined();
      expect(typeof sendEventConfirmationSMS).toBe('function');
    });

    it('should create event inquiry successfully', async () => {
      const publicCaller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await publicCaller.eventInquiries.create({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+447123456789',
        eventType: 'Wedding',
        venueAddress: '123 Test Street',
        eventDate: new Date('2026-06-15'),
        guestCount: 100,
        budget: '£5000',
        message: 'Looking for a wedding reception venue',
      });

      expect(result.success).toBe(true);
    });

    it('should update event inquiry status to booked', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create a test event inquiry
      const { eventInquiries } = await import('../drizzle/schema');
      const [inquiry] = await db.insert(eventInquiries).values({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+447123456789',
        eventType: 'Corporate Event',
        venueAddress: '456 Business Ave',
        eventDate: new Date('2026-07-20'),
        guestCount: 50,
        message: 'Corporate dinner',
        status: 'new',
      });

      const inquiryId = inquiry.insertId;

      // Update status to booked (should trigger Event Confirmation)
      const result = await caller.eventInquiries.updateStatus({
        id: inquiryId,
        status: 'booked',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Event Inquiry Response Workflow', () => {
    it('should have sendEventInquiryResponseEmail function available', async () => {
      const { sendEventInquiryResponseEmail } = await import('./email');
      
      expect(sendEventInquiryResponseEmail).toBeDefined();
      expect(typeof sendEventInquiryResponseEmail).toBe('function');
    });

    it('should have sendEventInquiryResponseSMS function available', async () => {
      const { sendEventInquiryResponseSMS } = await import('./services/sms.service');
      
      expect(sendEventInquiryResponseSMS).toBeDefined();
      expect(typeof sendEventInquiryResponseSMS).toBe('function');
    });

    it('should send response to event inquiry', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create a test event inquiry
      const { eventInquiries } = await import('../drizzle/schema');
      const [inquiry] = await db.insert(eventInquiries).values({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+447123456789',
        eventType: 'Birthday Party',
        venueAddress: '789 Party Lane',
        eventDate: new Date('2026-08-10'),
        guestCount: 30,
        message: 'Birthday celebration',
        status: 'new',
      });

      const inquiryId = inquiry.insertId;

      // Send response
      const result = await caller.eventInquiries.sendResponse({
        id: inquiryId,
        responseMessage: 'Thank you for your inquiry! We have availability on that date. Our event coordinator will contact you within 24 hours to discuss menu options and pricing.',
      });

      expect(result.success).toBe(true);
    });

    it('should update inquiry status to contacted after sending response', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { eventInquiries } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      // Create inquiry
      const [inquiry] = await db.insert(eventInquiries).values({
        customerName: 'Status Test',
        customerEmail: 'status@example.com',
        customerPhone: '+447123456789',
        eventType: 'Anniversary',
        venueAddress: '321 Love Street',
        message: 'Anniversary dinner',
        status: 'new',
      });

      const inquiryId = inquiry.insertId;

      // Send response
      await caller.eventInquiries.sendResponse({
        id: inquiryId,
        responseMessage: 'We would love to host your anniversary dinner!',
      });

      // Check status was updated
      const [updated] = await db.select().from(eventInquiries).where(eq(eventInquiries.id, inquiryId));
      expect(updated.status).toBe('contacted');
    });
  });

  describe('Catering Quote Request Workflow', () => {
    it('should have sendCateringQuoteRequestEmail function available', async () => {
      const { sendCateringQuoteRequestEmail } = await import('./email');
      
      expect(sendCateringQuoteRequestEmail).toBeDefined();
      expect(typeof sendCateringQuoteRequestEmail).toBe('function');
    });

    it('should have sendCateringQuoteRequestSMS function available', async () => {
      const { sendCateringQuoteRequestSMS } = await import('./services/sms.service');
      
      expect(sendCateringQuoteRequestSMS).toBeDefined();
      expect(typeof sendCateringQuoteRequestSMS).toBe('function');
    });

    it('should submit catering quote request', async () => {
      const publicCaller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await publicCaller.eventInquiries.requestCateringQuote({
        customerName: 'Catering Customer',
        customerEmail: 'catering@example.com',
        customerPhone: '+447123456789',
        cateringType: 'Office Lunch',
        guestCount: 25,
        eventDate: new Date('2026-09-05'),
        specialRequests: 'Vegetarian options required',
      });

      expect(result.success).toBe(true);
    });

    it('should create event inquiry record for catering request', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const publicCaller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await publicCaller.eventInquiries.requestCateringQuote({
        customerName: 'DB Test Customer',
        customerEmail: 'dbtest@example.com',
        customerPhone: '+447987654321',
        cateringType: 'Corporate Catering',
        guestCount: 40,
        eventDate: new Date('2026-10-15'),
        specialRequests: 'Halal menu required',
      });

      // Verify inquiry was created
      const { eventInquiries } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      const inquiries = await db.select()
        .from(eventInquiries)
        .where(eq(eventInquiries.customerEmail, 'dbtest@example.com'));

      expect(inquiries.length).toBeGreaterThan(0);
      expect(inquiries[0].eventType).toBe('Corporate Catering');
      expect(inquiries[0].guestCount).toBe(40);
    });
  });

  describe('SMS Template Database Integration', () => {
    it('should have SMS templates in database for Phase 3 workflows', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { smsTemplates } = await import('../drizzle/schema');
      const { inArray } = await import('drizzle-orm');

      const phase3Templates = await db.select()
        .from(smsTemplates)
        .where(inArray(smsTemplates.templateType, [
          'admin_new_order',
          'admin_weekly_report',
          'newsletter_confirmation',
          'event_confirmation',
          'event_inquiry_response',
          'catering_quote_request',
        ]));

      // Should have all 6 Phase 3 SMS templates
      expect(phase3Templates.length).toBe(6);
      
      // Verify each template type exists
      const templateTypes = phase3Templates.map(t => t.templateType);
      expect(templateTypes).toContain('admin_new_order');
      expect(templateTypes).toContain('admin_weekly_report');
      expect(templateTypes).toContain('newsletter_confirmation');
      expect(templateTypes).toContain('event_confirmation');
      expect(templateTypes).toContain('event_inquiry_response');
      expect(templateTypes).toContain('catering_quote_request');
    });

    it('should have all Phase 3 SMS templates active by default', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { smsTemplates } = await import('../drizzle/schema');
      const { inArray } = await import('drizzle-orm');

      const phase3Templates = await db.select()
        .from(smsTemplates)
        .where(inArray(smsTemplates.templateType, [
          'admin_new_order',
          'admin_weekly_report',
          'newsletter_confirmation',
          'event_confirmation',
          'event_inquiry_response',
          'catering_quote_request',
        ]));

      // All templates should be active
      const allActive = phase3Templates.every(t => t.isActive);
      expect(allActive).toBe(true);
    });
  });
});
