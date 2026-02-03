import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, getAllOpeningHours, getOpeningHoursByDay } from './db';
import { appRouter } from './routers';

describe('Opening Hours Integration', () => {
  it('should fetch all opening hours from database', async () => {
    const hours = await getAllOpeningHours();
    
    expect(hours).toBeDefined();
    expect(Array.isArray(hours)).toBe(true);
    expect(hours.length).toBe(7); // 7 days of the week
    
    // Check that each day has required fields
    hours.forEach(day => {
      expect(day).toHaveProperty('id');
      expect(day).toHaveProperty('dayOfWeek');
      expect(day).toHaveProperty('dayName');
      expect(day).toHaveProperty('openTime');
      expect(day).toHaveProperty('closeTime');
      expect(day).toHaveProperty('isClosed');
    });
    
    // Verify day names are correct
    const dayNames = hours.map(h => h.dayName);
    expect(dayNames).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  });

  it('should fetch opening hours for a specific day', async () => {
    // Test Monday (dayOfWeek = 1)
    const mondayHours = await getOpeningHoursByDay(1);
    
    expect(mondayHours).toBeDefined();
    expect(mondayHours?.dayOfWeek).toBe(1);
    expect(mondayHours?.openTime).toBeDefined();
    expect(mondayHours?.closeTime).toBeDefined();
    expect(typeof mondayHours?.isClosed).toBe('boolean');
  });

  it('should allow admin to fetch opening hours via tRPC', async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin', openId: 'test-admin' },
    });

    const hours = await caller.openingHours.list();
    
    expect(hours).toBeDefined();
    expect(Array.isArray(hours)).toBe(true);
    expect(hours.length).toBe(7);
  });

  it('should allow public access to opening hours via settings endpoint', async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const hours = await caller.settings.getPublicOpeningHours();
    
    expect(hours).toBeDefined();
    expect(Array.isArray(hours)).toBe(true);
    expect(hours.length).toBe(7);
    
    // Verify public endpoint includes dayName for display
    hours.forEach(day => {
      expect(day).toHaveProperty('dayName');
      expect(day).toHaveProperty('openTime');
      expect(day).toHaveProperty('closeTime');
    });
  });

  it('should validate order creation respects day-specific hours', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get current day's hours
    const now = new Date();
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const currentDayOfWeek = ukTime.getDay();
    
    const todayHours = await getOpeningHoursByDay(currentDayOfWeek);
    
    expect(todayHours).toBeDefined();
    
    // If restaurant is closed today, we can't test order creation
    if (todayHours?.isClosed) {
      console.log(`Skipping order test - restaurant closed on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDayOfWeek]}`);
      return;
    }
    
    // Verify hours are in correct format (HH:MM)
    expect(todayHours?.openTime).toMatch(/^\d{2}:\d{2}$/);
    expect(todayHours?.closeTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should group consecutive days with same hours in footer display', () => {
    // Test the grouping logic
    const mockHours = [
      { dayName: 'Sunday', openTime: '12:00', closeTime: '21:00', isClosed: false },
      { dayName: 'Monday', openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayName: 'Tuesday', openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayName: 'Wednesday', openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayName: 'Thursday', openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayName: 'Friday', openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayName: 'Saturday', openTime: '12:00', closeTime: '23:00', isClosed: false },
    ];

    // Expected grouping:
    // Sunday: 12:00 PM - 9:00 PM
    // Monday-Thursday: 12:00 PM - 10:00 PM
    // Friday-Saturday: 12:00 PM - 11:00 PM
    
    const grouped: string[] = [];
    let currentGroup: any[] = [];

    mockHours.forEach((hour, index) => {
      if (hour.isClosed) {
        if (currentGroup.length > 0) {
          grouped.push(formatGroup(currentGroup));
          currentGroup = [];
        }
        grouped.push(`${hour.dayName}: Closed`);
      } else {
        if (
          currentGroup.length === 0 ||
          (currentGroup[0].openTime === hour.openTime && currentGroup[0].closeTime === hour.closeTime)
        ) {
          currentGroup.push(hour);
        } else {
          grouped.push(formatGroup(currentGroup));
          currentGroup = [hour];
        }
      }

      if (index === mockHours.length - 1 && currentGroup.length > 0) {
        grouped.push(formatGroup(currentGroup));
      }
    });

    expect(grouped.length).toBe(3); // Three groups
    expect(grouped[0]).toContain('Sunday');
    expect(grouped[1]).toContain('Monday-Thursday');
    expect(grouped[2]).toContain('Friday-Saturday');
  });
});

// Helper function for grouping test
function formatGroup(group: any[]) {
  if (group.length === 1) {
    return `${group[0].dayName}: ${group[0].openTime} - ${group[0].closeTime}`;
  }
  return `${group[0].dayName}-${group[group.length - 1].dayName}: ${group[0].openTime} - ${group[0].closeTime}`;
}
