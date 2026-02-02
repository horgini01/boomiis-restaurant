import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';
import { getDb } from './db';
import { subscribers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Newsletter Integration', () => {
  const mockContext: Context = {
    req: {} as any,
    res: {} as any,
    user: null,
  };

  beforeAll(async () => {
    // Clean up test subscribers
    const db = await getDb();
    if (db) {
      await db.delete(subscribers).where(eq(subscribers.email, 'test-newsletter@example.com'));
    }
  });

  it('should subscribe a new user to newsletter', async () => {
    const caller = appRouter.createCaller(mockContext);

    const result = await caller.newsletter.subscribe({
      email: 'test-newsletter@example.com',
      name: 'Test User',
      source: 'homepage',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('subscribed');

    // Verify subscriber was added to database
    const db = await getDb();
    if (db) {
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, 'test-newsletter@example.com'))
        .limit(1);

      expect(subscriber).toBeDefined();
      expect(subscriber.email).toBe('test-newsletter@example.com');
      expect(subscriber.name).toBe('Test User');
      expect(subscriber.source).toBe('homepage');
      expect(subscriber.isActive).toBe(true);
    }
  });

  it('should prevent duplicate subscriptions', async () => {
    const caller = appRouter.createCaller(mockContext);

    // Try to subscribe again with same email
    await expect(
      caller.newsletter.subscribe({
        email: 'test-newsletter@example.com',
        name: 'Test User 2',
        source: 'checkout',
      })
    ).rejects.toThrow('already subscribed');
  });

  it('should validate email format', async () => {
    const caller = appRouter.createCaller(mockContext);

    await expect(
      caller.newsletter.subscribe({
        email: 'invalid-email',
        name: 'Test User',
        source: 'homepage',
      })
    ).rejects.toThrow();
  });
});

describe('Newsletter Admin Operations', () => {
  const adminContext: Context = {
    req: {} as any,
    res: {} as any,
    user: {
      id: 1,
      openId: 'test-admin',
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      createdAt: new Date(),
    },
  };

  const nonAdminContext: Context = {
    req: {} as any,
    res: {} as any,
    user: {
      id: 2,
      openId: 'test-user',
      name: 'Regular User',
      email: 'user@test.com',
      role: 'user',
      createdAt: new Date(),
    },
  };

  it('should allow admin to get all subscribers', async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.subscribers.getAll();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should prevent non-admin from accessing subscribers', async () => {
    const caller = appRouter.createCaller(nonAdminContext);

    await expect(caller.subscribers.getAll()).rejects.toThrow('Unauthorized');
  });

  it('should allow admin to unsubscribe a user', async () => {
    const caller = appRouter.createCaller(adminContext);

    // Get a subscriber
    const db = await getDb();
    if (db) {
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, 'test-newsletter@example.com'))
        .limit(1);

      if (subscriber) {
        const result = await caller.subscribers.unsubscribe({ id: subscriber.id });
        expect(result.success).toBe(true);

        // Verify subscriber was unsubscribed
        const [updated] = await db
          .select()
          .from(subscribers)
          .where(eq(subscribers.id, subscriber.id))
          .limit(1);

        expect(updated.isActive).toBe(false);
        expect(updated.unsubscribedAt).toBeDefined();
      }
    }
  });
});

describe('Email Campaigns', () => {
  const adminContext: Context = {
    req: {} as any,
    res: {} as any,
    user: {
      id: 1,
      openId: 'test-admin',
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      createdAt: new Date(),
    },
  };

  it('should allow admin to create a campaign', async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.campaigns.create({
      campaignName: 'Test Campaign',
      subject: 'Test Subject',
      bodyHtml: '<h1>Test Content</h1><p>This is a test campaign.</p>',
    });

    expect(result.success).toBe(true);
    expect(result.campaignId).toBeDefined();
  });

  it('should allow admin to get all campaigns', async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.campaigns.getAll();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
