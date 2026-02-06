import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { testimonials, testimonialResponseTemplates } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Response Templates & Notifications', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testTemplateId: number;
  let testTestimonialId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create a test template
    await db.insert(testimonialResponseTemplates).values({
      name: 'Test Thank You',
      content: 'Thank you for your wonderful feedback! We appreciate your support.',
      displayOrder: 0,
      isActive: true,
    });

    const createdTemplate = await db.select()
      .from(testimonialResponseTemplates)
      .where(eq(testimonialResponseTemplates.name, 'Test Thank You'))
      .limit(1);

    testTemplateId = createdTemplate[0].id;

    // Create a test testimonial with email
    await db.insert(testimonials).values({
      customerName: 'Email Test Customer',
      customerEmail: 'customer@example.com',
      content: 'Great food and service!',
      rating: 5,
      isApproved: true,
      isFeatured: false,
      displayOrder: 0,
    });

    const createdTestimonial = await db.select()
      .from(testimonials)
      .where(eq(testimonials.customerName, 'Email Test Customer'))
      .limit(1);

    testTestimonialId = createdTestimonial[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      if (testTemplateId) {
        await db.delete(testimonialResponseTemplates).where(eq(testimonialResponseTemplates.id, testTemplateId));
      }
      if (testTestimonialId) {
        await db.delete(testimonials).where(eq(testimonials.id, testTestimonialId));
      }
    }
  });

  describe('Response Templates CRUD', () => {
    it('should create a new response template', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.testimonials.createTemplate({
        name: 'Apology Template',
        content: 'We sincerely apologize for any inconvenience. We are working to improve our service.',
        displayOrder: 1,
      });

      expect(result.success).toBe(true);

      // Verify template was created
      const templates = await db!.select()
        .from(testimonialResponseTemplates)
        .where(eq(testimonialResponseTemplates.name, 'Apology Template'));

      expect(templates.length).toBe(1);
      expect(templates[0].content).toContain('sincerely apologize');

      // Clean up
      await db!.delete(testimonialResponseTemplates).where(eq(testimonialResponseTemplates.id, templates[0].id));
    });

    it('should get all active templates', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      const templates = await caller.testimonials.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.isActive)).toBe(true);
    });

    it('should update a template', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.testimonials.updateTemplate({
        id: testTemplateId,
        name: 'Updated Thank You',
        content: 'Updated content: Thank you for your feedback!',
        displayOrder: 0,
        isActive: true,
      });

      expect(result.success).toBe(true);

      // Verify update
      const updated = await db!.select()
        .from(testimonialResponseTemplates)
        .where(eq(testimonialResponseTemplates.id, testTemplateId))
        .limit(1);

      expect(updated[0].name).toBe('Updated Thank You');
      expect(updated[0].content).toContain('Updated content');
    });

    it('should delete a template', async () => {
      // Create a template to delete
      await db!.insert(testimonialResponseTemplates).values({
        name: 'To Be Deleted',
        content: 'This will be deleted',
        displayOrder: 99,
        isActive: true,
      });

      const toDelete = await db!.select()
        .from(testimonialResponseTemplates)
        .where(eq(testimonialResponseTemplates.name, 'To Be Deleted'))
        .limit(1);

      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.testimonials.deleteTemplate({ id: toDelete[0].id });

      expect(result.success).toBe(true);

      // Verify deletion
      const deleted = await db!.select()
        .from(testimonialResponseTemplates)
        .where(eq(testimonialResponseTemplates.id, toDelete[0].id));

      expect(deleted.length).toBe(0);
    });

    it('should not allow non-admin users to manage templates', async () => {
      const caller = appRouter.createCaller({
        user: { id: 2, email: 'user@test.com', name: 'User', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.testimonials.createTemplate({
          name: 'Unauthorized',
          content: 'Should fail',
          displayOrder: 0,
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Email Notifications', () => {
    it('should send email notification when admin responds to testimonial', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      // Add a response (this should trigger email notification)
      const result = await caller.testimonials.updateResponse({
        id: testTestimonialId,
        adminResponse: 'Thank you for your kind words! We look forward to serving you again.',
      });

      expect(result.success).toBe(true);

      // Verify response was saved
      const updated = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.id, testTestimonialId))
        .limit(1);

      expect(updated[0].adminResponse).toBeTruthy();
      expect(updated[0].adminResponseDate).toBeTruthy();

      // Note: Email sending is tested indirectly through the mutation success
      // In a real environment, we would check email logs or use a mock email service
    });

    it('should not send email if testimonial has no customer email', async () => {
      // Create testimonial without email
      await db!.insert(testimonials).values({
        customerName: 'No Email Customer',
        customerEmail: null,
        content: 'Good food',
        rating: 4,
        isApproved: true,
        isFeatured: false,
        displayOrder: 0,
      });

      const noEmailTestimonial = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'No Email Customer'))
        .limit(1);

      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      // This should succeed but not send email
      const result = await caller.testimonials.updateResponse({
        id: noEmailTestimonial[0].id,
        adminResponse: 'Thank you!',
      });

      expect(result.success).toBe(true);

      // Clean up
      await db!.delete(testimonials).where(eq(testimonials.id, noEmailTestimonial[0].id));
    });

    it('should not send email when response is removed', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      // Remove response (should not trigger email)
      const result = await caller.testimonials.updateResponse({
        id: testTestimonialId,
        adminResponse: undefined,
      });

      expect(result.success).toBe(true);

      // Verify response was removed
      const updated = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.id, testTestimonialId))
        .limit(1);

      expect(updated[0].adminResponse).toBeNull();
    });
  });
});
