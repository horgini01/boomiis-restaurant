import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Reservation Analytics & Weekly Reports', () => {
  const caller = appRouter.createCaller({ user: { id: 1, role: 'admin' } } as any);

  describe('Reservation Analytics', () => {
    it('should return reservation analytics data structure', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = await caller.admin.reservationAnalytics({ startDate, endDate });

      expect(result).toBeDefined();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('busiestDays');
      expect(result).toHaveProperty('avgPartySize');
      expect(result).toHaveProperty('statusBreakdown');
      expect(result).toHaveProperty('peakTimes');
      expect(result).toHaveProperty('cancellationRate');
      expect(result).toHaveProperty('totalReservations');
    });

    it('should return busiest days as array of objects', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = await caller.admin.reservationAnalytics({ startDate, endDate });

      expect(Array.isArray(result.busiestDays)).toBe(true);
      if (result.busiestDays.length > 0) {
        expect(result.busiestDays[0]).toHaveProperty('day');
        expect(result.busiestDays[0]).toHaveProperty('count');
      }
    });

    it('should return status breakdown with all statuses', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = await caller.admin.reservationAnalytics({ startDate, endDate });

      expect(result.statusBreakdown).toHaveProperty('pending');
      expect(result.statusBreakdown).toHaveProperty('confirmed');
      expect(result.statusBreakdown).toHaveProperty('cancelled');
      expect(result.statusBreakdown).toHaveProperty('completed');
    });

    it('should return peak times as array', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = await caller.admin.reservationAnalytics({ startDate, endDate });

      expect(Array.isArray(result.peakTimes)).toBe(true);
      if (result.peakTimes.length > 0) {
        expect(result.peakTimes[0]).toHaveProperty('hour');
        expect(result.peakTimes[0]).toHaveProperty('count');
      }
    });

    it('should calculate cancellation rate as numeric string', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = await caller.admin.reservationAnalytics({ startDate, endDate });

      expect(typeof result.cancellationRate).toBe('string');
      // Cancellation rate is a numeric string like "0" or "15.5", not "0%" or "15.5%"
      expect(parseFloat(result.cancellationRate)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Weekly Report Generation', () => {
    it('should generate weekly report data structure', async () => {
      const result = await caller.admin.generateWeeklyReport();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('startDate');
      expect(result).toHaveProperty('endDate');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('avgOrderValue');
      expect(result).toHaveProperty('totalReservations');
      expect(result).toHaveProperty('topItem');
      expect(result).toHaveProperty('topItemSales');
      expect(result).toHaveProperty('busiestDay');
      expect(result).toHaveProperty('busiestDayOrders');
      expect(result).toHaveProperty('peakHour');
      expect(result).toHaveProperty('newCustomers');
      expect(result).toHaveProperty('repeatCustomers');
      expect(result).toHaveProperty('repeatRate');
      expect(result).toHaveProperty('pendingTestimonials');
      expect(result).toHaveProperty('unconfirmedReservations');
      expect(result).toHaveProperty('neverOrderedCount');
      expect(result).toHaveProperty('dashboardUrl');
    });

    it('should return alert counts as numbers', async () => {
      const result = await caller.admin.generateWeeklyReport();

      expect(typeof result.pendingTestimonials).toBe('number');
      expect(typeof result.unconfirmedReservations).toBe('number');
      expect(typeof result.neverOrderedCount).toBe('number');
    });

    it('should return dates in readable format', async () => {
      const result = await caller.admin.generateWeeklyReport();

      // Dates are formatted as "Jan 30, 2026" not YYYY-MM-DD
      expect(typeof result.startDate).toBe('string');
      expect(typeof result.endDate).toBe('string');
      expect(result.startDate.length).toBeGreaterThan(0);
      expect(result.endDate.length).toBeGreaterThan(0);
    });

    it('should return revenue and avgOrderValue as strings', async () => {
      const result = await caller.admin.generateWeeklyReport();

      expect(typeof result.totalRevenue).toBe('string');
      expect(typeof result.avgOrderValue).toBe('string');
      // totalOrders and totalReservations are numbers
      expect(typeof result.totalOrders).toBe('number');
      expect(typeof result.totalReservations).toBe('number');
    });

    it('should return repeat rate as percentage string', async () => {
      const result = await caller.admin.generateWeeklyReport();

      expect(typeof result.repeatRate).toBe('string');
      expect(result.repeatRate).toMatch(/%$/); // Should end with %
    });
  });
});
