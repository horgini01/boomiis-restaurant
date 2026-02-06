import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import { subDays, format } from 'date-fns';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-admin',
    name: 'Test Admin',
    email: 'admin@test.com',
    loginMethod: 'email' as const,
    role: 'admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {} as any,
  };
}

describe('Dashboard & Analytics Features', () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);

  describe('Enhanced Dashboard', () => {
    it('should return today snapshot with comparisons', async () => {
      const result = await caller.admin.todaySnapshot();
      
      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('yesterday');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('upcomingReservations');
      
      expect(result.today).toHaveProperty('revenue');
      expect(result.today).toHaveProperty('orders');
      expect(result.today).toHaveProperty('reservations');
      
      expect(result.changes).toHaveProperty('revenue');
      expect(result.changes).toHaveProperty('orders');
      expect(result.changes).toHaveProperty('reservations');
      
      expect(Array.isArray(result.upcomingReservations)).toBe(true);
    });

    it('should return alerts for pending items', async () => {
      const result = await caller.admin.alerts();
      
      expect(result).toHaveProperty('pendingTestimonials');
      expect(result).toHaveProperty('unconfirmedReservations');
      
      expect(typeof result.pendingTestimonials).toBe('number');
      expect(typeof result.unconfirmedReservations).toBe('number');
    });

    it('should return recent activity feed', async () => {
      const result = await caller.admin.recentActivity();
      
      expect(Array.isArray(result)).toBe(true);
      // Activity feed structure varies by type, just verify it's an array
    });

    it('should return stats with trends', async () => {
      const result = await caller.admin.statsWithTrends();
      
      expect(result).toHaveProperty('menuItemsCount');
      expect(result).toHaveProperty('pendingOrdersCount');
      expect(result).toHaveProperty('pendingReservationsCount');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('trends');
      
      expect(result.trends).toHaveProperty('revenue');
      expect(result.trends).toHaveProperty('orders');
    });
  });

  describe('Customer Insights', () => {
    it('should return customer analytics for date range', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      const result = await caller.admin.customerInsights({ startDate, endDate });
      
      expect(result).toHaveProperty('totalCustomers');
      expect(result).toHaveProperty('repeatCustomers');
      expect(result).toHaveProperty('repeatRate');
      expect(result).toHaveProperty('avgLifetimeValue');
      expect(result).toHaveProperty('newCustomers');
      expect(result).toHaveProperty('topCustomers');
      
      expect(typeof result.totalCustomers).toBe('number');
      expect(typeof result.repeatRate).toBe('string');
      expect(Array.isArray(result.topCustomers)).toBe(true);
      
      if (result.topCustomers.length > 0) {
        expect(result.topCustomers[0]).toHaveProperty('name');
        expect(result.topCustomers[0]).toHaveProperty('email');
        expect(result.topCustomers[0]).toHaveProperty('orders');
        expect(result.topCustomers[0]).toHaveProperty('total');
      }
    });

    it('should limit top customers to 10', async () => {
      const startDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      const result = await caller.admin.customerInsights({ startDate, endDate });
      
      expect(result.topCustomers.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Menu Performance', () => {
    it('should return menu analytics for date range', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      const result = await caller.admin.menuPerformance({ startDate, endDate });
      
      expect(result).toHaveProperty('categoryRevenue');
      expect(result).toHaveProperty('topItems');
      expect(result).toHaveProperty('bottomItems');
      expect(result).toHaveProperty('neverOrdered');
      expect(result).toHaveProperty('totalItemsSold');
      expect(result).toHaveProperty('avgItemsPerOrder');
      
      expect(Array.isArray(result.categoryRevenue)).toBe(true);
      expect(Array.isArray(result.topItems)).toBe(true);
      expect(Array.isArray(result.neverOrdered)).toBe(true);
      expect(typeof result.totalItemsSold).toBe('number');
    });

    it('should return top items sorted by revenue', async () => {
      const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      const result = await caller.admin.menuPerformance({ startDate, endDate });
      
      if (result.topItems.length > 1) {
        const revenues = result.topItems.map(item => parseFloat(item.revenue));
        for (let i = 0; i < revenues.length - 1; i++) {
          expect(revenues[i]).toBeGreaterThanOrEqual(revenues[i + 1]);
        }
      }
    });

    it('should identify never ordered items', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      const result = await caller.admin.menuPerformance({ startDate, endDate });
      
      expect(Array.isArray(result.neverOrdered)).toBe(true);
      if (result.neverOrdered.length > 0) {
        expect(result.neverOrdered[0]).toHaveProperty('id');
        expect(result.neverOrdered[0]).toHaveProperty('name');
        expect(result.neverOrdered[0]).toHaveProperty('category');
      }
    });
  });
});
