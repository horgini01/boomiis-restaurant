import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { eventInquiries } from '../drizzle/schema';

describe('Event & Catering Analytics', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  const createMockContext = () => ({
    user: {
      id: 1,
      openId: 'test-admin',
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: 'email',
    },
    req: {} as any,
    res: {} as any,
  });

  describe('eventCateringAnalytics', () => {
    it('should return analytics data for event inquiries', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2024-01-01',
        endDate: '2026-12-31',
      });

      expect(result).toHaveProperty('statusBreakdown');
      expect(result).toHaveProperty('eventTypes');
      expect(result).toHaveProperty('avgGuestCount');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('totalInquiries');
      expect(result).toHaveProperty('monthlyTrend');
    });

    it('should calculate status breakdown correctly', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2024-01-01',
        endDate: '2026-12-31',
      });

      const { statusBreakdown } = result;
      expect(statusBreakdown).toHaveProperty('new');
      expect(statusBreakdown).toHaveProperty('contacted');
      expect(statusBreakdown).toHaveProperty('quoted');
      expect(statusBreakdown).toHaveProperty('booked');
      expect(statusBreakdown).toHaveProperty('cancelled');
      
      expect(typeof statusBreakdown.new).toBe('number');
      expect(typeof statusBreakdown.contacted).toBe('number');
      expect(typeof statusBreakdown.quoted).toBe('number');
      expect(typeof statusBreakdown.booked).toBe('number');
      expect(typeof statusBreakdown.cancelled).toBe('number');
    });

    it('should return event types sorted by popularity', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2024-01-01',
        endDate: '2026-12-31',
      });

      expect(Array.isArray(result.eventTypes)).toBe(true);
      
      // Check if sorted descending by count
      for (let i = 0; i < result.eventTypes.length - 1; i++) {
        expect(result.eventTypes[i].count).toBeGreaterThanOrEqual(result.eventTypes[i + 1].count);
      }
    });

    it('should calculate average guest count', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2024-01-01',
        endDate: '2026-12-31',
      });

      expect(typeof result.avgGuestCount).toBe('string');
      const avgGuests = parseFloat(result.avgGuestCount);
      expect(avgGuests).toBeGreaterThanOrEqual(0);
    });

    it('should calculate conversion rate correctly', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2024-01-01',
        endDate: '2026-12-31',
      });

      expect(typeof result.conversionRate).toBe('string');
      const rate = parseFloat(result.conversionRate);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
      
      // Verify calculation
      const expectedRate = result.totalInquiries > 0
        ? ((result.statusBreakdown.booked / result.totalInquiries) * 100).toFixed(1)
        : '0';
      expect(result.conversionRate).toBe(expectedRate);
    });

    it('should return monthly trend sorted chronologically', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2024-01-01',
        endDate: '2026-12-31',
      });

      expect(Array.isArray(result.monthlyTrend)).toBe(true);
      
      // Check if sorted chronologically
      for (let i = 0; i < result.monthlyTrend.length - 1; i++) {
        expect(result.monthlyTrend[i].month <= result.monthlyTrend[i + 1].month).toBe(true);
      }
    });

    it('should handle empty date range', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.admin.eventCateringAnalytics({
        startDate: '2020-01-01',
        endDate: '2020-01-02',
      });

      expect(result.totalInquiries).toBe(0);
      expect(result.avgGuestCount).toBe('0');
      expect(result.conversionRate).toBe('0');
      expect(result.eventTypes).toHaveLength(0);
      expect(result.monthlyTrend).toHaveLength(0);
    });

    it('should throw error for non-admin users', async () => {
      const nonAdminContext = {
        user: {
          ...createMockContext().user,
          role: 'user' as const,
        },
        req: {} as any,
        res: {} as any,
      };

      const caller = appRouter.createCaller(nonAdminContext);
      
      await expect(
        caller.admin.eventCateringAnalytics({
          startDate: '2024-01-01',
          endDate: '2026-12-31',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });
});
