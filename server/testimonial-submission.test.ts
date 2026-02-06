import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { testimonials } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Testimonial Submission', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');
  });

  it('should submit a testimonial with isApproved=false by default', async () => {
    const testData = {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      content: 'This is a test testimonial for the restaurant.',
      rating: 5,
      isApproved: false,
      isFeatured: false,
      displayOrder: 0,
    };

    // Insert testimonial
    await db!.insert(testimonials).values(testData);

    // Retrieve the testimonial
    const result = await db!
      .select()
      .from(testimonials)
      .where(eq(testimonials.customerEmail, 'test@example.com'))
      .limit(1);

    expect(result.length).toBe(1);
    expect(result[0].customerName).toBe('Test Customer');
    expect(result[0].isApproved).toBe(false);
    expect(result[0].rating).toBe(5);

    // Cleanup
    await db!.delete(testimonials).where(eq(testimonials.customerEmail, 'test@example.com'));
  });

  it('should allow submission without email (optional field)', async () => {
    const testData = {
      customerName: 'Anonymous Customer',
      content: 'Great experience without providing email.',
      rating: 4,
      isApproved: false,
      isFeatured: false,
      displayOrder: 0,
    };

    // Insert testimonial
    await db!.insert(testimonials).values(testData);

    // Retrieve the testimonial
    const result = await db!
      .select()
      .from(testimonials)
      .where(eq(testimonials.customerName, 'Anonymous Customer'))
      .limit(1);

    expect(result.length).toBe(1);
    expect(result[0].customerEmail).toBeNull();
    expect(result[0].content).toBe('Great experience without providing email.');

    // Cleanup
    await db!.delete(testimonials).where(eq(testimonials.customerName, 'Anonymous Customer'));
  });

  it('should validate rating is between 1 and 5', async () => {
    const validRatings = [1, 2, 3, 4, 5];
    
    for (const rating of validRatings) {
      const testData = {
        customerName: `Test Customer ${rating}`,
        content: `Test content for rating ${rating}`,
        rating,
        isApproved: false,
        isFeatured: false,
        displayOrder: 0,
      };

      await db!.insert(testimonials).values(testData);
      
      const result = await db!
        .select()
        .from(testimonials)
        .where(eq(testimonials.customerName, `Test Customer ${rating}`))
        .limit(1);

      expect(result[0].rating).toBe(rating);

      // Cleanup
      await db!.delete(testimonials).where(eq(testimonials.customerName, `Test Customer ${rating}`));
    }
  });
});
