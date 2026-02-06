import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { testimonials } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Testimonial Response Feature', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testTestimonialId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create a test testimonial
    await db.insert(testimonials).values({
      customerName: 'Response Test Customer',
      content: 'Test testimonial for response feature',
      rating: 5,
      isApproved: true,
      isFeatured: true,
      displayOrder: 0,
    });

    const created = await db.select()
      .from(testimonials)
      .where(eq(testimonials.customerName, 'Response Test Customer'))
      .limit(1);

    testTestimonialId = created[0].id;
  });

  afterAll(async () => {
    // Clean up test testimonial
    if (db && testTestimonialId) {
      await db.delete(testimonials).where(eq(testimonials.id, testTestimonialId));
    }
  });

  it('should add admin response to testimonial', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.testimonials.updateResponse({
      id: testTestimonialId,
      adminResponse: 'Thank you for your wonderful feedback! We are thrilled to hear you enjoyed your experience.',
    });

    expect(result.success).toBe(true);

    // Verify response was saved
    const updated = await db!.select()
      .from(testimonials)
      .where(eq(testimonials.id, testTestimonialId))
      .limit(1);

    expect(updated[0].adminResponse).toBe('Thank you for your wonderful feedback! We are thrilled to hear you enjoyed your experience.');
    expect(updated[0].adminResponseDate).toBeTruthy();
  });

  it('should update existing admin response', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    // Update the response
    const result = await caller.testimonials.updateResponse({
      id: testTestimonialId,
      adminResponse: 'Updated response: We appreciate your continued support!',
    });

    expect(result.success).toBe(true);

    // Verify response was updated
    const updated = await db!.select()
      .from(testimonials)
      .where(eq(testimonials.id, testTestimonialId))
      .limit(1);

    expect(updated[0].adminResponse).toBe('Updated response: We appreciate your continued support!');
  });

  it('should remove admin response when empty string is provided', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    // Remove the response by passing undefined
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
    expect(updated[0].adminResponseDate).toBeNull();
  });

  it('should include admin response in featured testimonials', async () => {
    // Add a response first
    const adminCaller = appRouter.createCaller({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    await adminCaller.testimonials.updateResponse({
      id: testTestimonialId,
      adminResponse: 'We look forward to serving you again!',
    });

    // Get featured testimonials
    const publicCaller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const featured = await publicCaller.testimonials.getFeatured();

    const testimonialWithResponse = featured.find(t => t.id === testTestimonialId);
    expect(testimonialWithResponse).toBeDefined();
    expect(testimonialWithResponse?.adminResponse).toBe('We look forward to serving you again!');
    expect(testimonialWithResponse?.adminResponseDate).toBeTruthy();
  });

  it('should not allow non-admin users to add responses', async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, email: 'user@test.com', name: 'User', role: 'user' },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.testimonials.updateResponse({
        id: testTestimonialId,
        adminResponse: 'Unauthorized response attempt',
      })
    ).rejects.toThrow('Unauthorized');
  });
});
