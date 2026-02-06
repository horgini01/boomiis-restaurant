import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { testimonials } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Testimonial Features', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testTestimonialIds: number[] = [];

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');
  });

  afterAll(async () => {
    // Clean up test testimonials
    if (db && testTestimonialIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      await db.delete(testimonials).where(inArray(testimonials.id, testTestimonialIds));
    }
  });

  describe('Email Notifications', () => {
    it('should create testimonial with pending approval status', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.testimonials.submit({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        content: 'This is a test testimonial for email notification',
        rating: 5,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Thank you for your testimonial');

      // Verify testimonial was created with pending status
      const created = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Test Customer'))
        .limit(1);

      expect(created.length).toBe(1);
      expect(created[0].isApproved).toBe(false);
      expect(created[0].content).toBe('This is a test testimonial for email notification');
      
      testTestimonialIds.push(created[0].id);
    });
  });

  describe('Homepage Carousel', () => {
    it('should only return approved and featured testimonials', async () => {
      // Create test testimonials with different statuses
      const testimonial1 = await db!.insert(testimonials).values({
        customerName: 'Featured Customer 1',
        content: 'Featured testimonial 1',
        rating: 5,
        isApproved: true,
        isFeatured: true,
        displayOrder: 1,
      });

      const testimonial2 = await db!.insert(testimonials).values({
        customerName: 'Not Featured Customer',
        content: 'Not featured testimonial',
        rating: 4,
        isApproved: true,
        isFeatured: false,
        displayOrder: 0,
      });

      const testimonial3 = await db!.insert(testimonials).values({
        customerName: 'Pending Customer',
        content: 'Pending testimonial',
        rating: 5,
        isApproved: false,
        isFeatured: true,
        displayOrder: 2,
      });

      // Get featured testimonials
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const featured = await caller.testimonials.getFeatured();

      // Should only include approved AND featured testimonials
      expect(featured.length).toBeGreaterThanOrEqual(1);
      
      const featuredCustomer1 = featured.find(t => t.customerName === 'Featured Customer 1');
      expect(featuredCustomer1).toBeDefined();
      expect(featuredCustomer1?.isApproved).toBe(true);
      expect(featuredCustomer1?.isFeatured).toBe(true);

      // Should not include non-featured or pending testimonials
      const notFeatured = featured.find(t => t.customerName === 'Not Featured Customer');
      const pending = featured.find(t => t.customerName === 'Pending Customer');
      expect(notFeatured).toBeUndefined();
      expect(pending).toBeUndefined();

      // Track IDs for cleanup
      const allCreated = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Featured Customer 1'));
      testTestimonialIds.push(...allCreated.map(t => t.id));
      
      const notFeaturedCreated = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Not Featured Customer'));
      testTestimonialIds.push(...notFeaturedCreated.map(t => t.id));
      
      const pendingCreated = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Pending Customer'));
      testTestimonialIds.push(...pendingCreated.map(t => t.id));
    });
  });

  describe('Bulk Approval', () => {
    it('should approve multiple testimonials at once', async () => {
      // Create test testimonials
      await db!.insert(testimonials).values([
        {
          customerName: 'Bulk Test 1',
          content: 'Bulk approval test 1',
          rating: 5,
          isApproved: false,
          isFeatured: false,
          displayOrder: 0,
        },
        {
          customerName: 'Bulk Test 2',
          content: 'Bulk approval test 2',
          rating: 4,
          isApproved: false,
          isFeatured: false,
          displayOrder: 0,
        },
        {
          customerName: 'Bulk Test 3',
          content: 'Bulk approval test 3',
          rating: 5,
          isApproved: false,
          isFeatured: false,
          displayOrder: 0,
        },
      ]);

      // Get the created testimonial IDs
      const created = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Test 1'));
      const created2 = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Test 2'));
      const created3 = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Test 3'));

      const ids = [created[0].id, created2[0].id, created3[0].id];
      testTestimonialIds.push(...ids);

      // Bulk approve
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.testimonials.bulkApprove({ ids });

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);

      // Verify all are approved
      const approved = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Test 1'));
      const approved2 = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Test 2'));
      const approved3 = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Test 3'));

      expect(approved[0].isApproved).toBe(true);
      expect(approved2[0].isApproved).toBe(true);
      expect(approved3[0].isApproved).toBe(true);
    });

    it('should reject and delete multiple testimonials at once', async () => {
      // Create test testimonials
      await db!.insert(testimonials).values([
        {
          customerName: 'Bulk Reject 1',
          content: 'Bulk reject test 1',
          rating: 2,
          isApproved: false,
          isFeatured: false,
          displayOrder: 0,
        },
        {
          customerName: 'Bulk Reject 2',
          content: 'Bulk reject test 2',
          rating: 1,
          isApproved: false,
          isFeatured: false,
          displayOrder: 0,
        },
      ]);

      // Get the created testimonial IDs
      const created = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Reject 1'));
      const created2 = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Reject 2'));

      const ids = [created[0].id, created2[0].id];

      // Bulk reject
      const caller = appRouter.createCaller({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.testimonials.bulkReject({ ids });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      // Verify they are deleted
      const deleted = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Reject 1'));
      const deleted2 = await db!.select()
        .from(testimonials)
        .where(eq(testimonials.customerName, 'Bulk Reject 2'));

      expect(deleted.length).toBe(0);
      expect(deleted2.length).toBe(0);
    });
  });
});
