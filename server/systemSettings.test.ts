import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { systemSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('System Settings - Service Toggle Feature', () => {
  let adminContext: any;

  beforeAll(async () => {
    // Create admin context for testing
    adminContext = {
      user: {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      },
    };

    // Ensure default settings exist
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const existing = await db.select().from(systemSettings).limit(1);
    if (existing.length === 0) {
      await db.insert(systemSettings).values([
        { settingKey: 'reservations_enabled', settingValue: 'true' },
        { settingKey: 'reservations_closure_message', settingValue: '' },
        { settingKey: 'events_enabled', settingValue: 'true' },
        { settingKey: 'events_closure_message', settingValue: '' },
      ]);
    }
  });

  afterAll(async () => {
    // Reset to default state
    const db = await getDb();
    if (!db) return;
    
    // Reset each setting to default
    await db.update(systemSettings)
      .set({ settingValue: 'true' })
      .where(eq(systemSettings.settingKey, 'reservations_enabled'));
    
    await db.update(systemSettings)
      .set({ settingValue: '' })
      .where(eq(systemSettings.settingKey, 'reservations_closure_message'));
    
    await db.update(systemSettings)
      .set({ settingValue: 'true' })
      .where(eq(systemSettings.settingKey, 'events_enabled'));
    
    await db.update(systemSettings)
      .set({ settingValue: '' })
      .where(eq(systemSettings.settingKey, 'events_closure_message'));
  });

  describe('getPublicSettings', () => {
    it('should return current system settings without authentication', async () => {
      const caller = appRouter.createCaller({ user: null });
      const settings = await caller.systemSettings.getPublicSettings();

      expect(settings).toBeDefined();
      expect(settings).toHaveProperty('reservationsEnabled');
      expect(settings).toHaveProperty('reservationsClosureMessage');
      expect(settings).toHaveProperty('eventsEnabled');
      expect(settings).toHaveProperty('eventsClosureMessage');
      expect(typeof settings.reservationsEnabled).toBe('boolean');
      expect(typeof settings.eventsEnabled).toBe('boolean');
    });
  });

  describe('updateReservationSettings', () => {
    it('should require admin authentication', async () => {
      const caller = appRouter.createCaller({ user: null });

      await expect(
        caller.systemSettings.updateReservationSettings({
          enabled: false,
          closureMessage: 'Test message',
        })
      ).rejects.toThrow();
    });

    it('should allow admin to disable reservations', async () => {
      const caller = appRouter.createCaller(adminContext);

      const result = await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'Closed for maintenance',
      });

      expect(result.success).toBe(true);

      // Verify via public API
      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsEnabled).toBe(false);
      expect(settings.reservationsClosureMessage).toBe('Closed for maintenance');
    });

    it('should allow admin to enable reservations', async () => {
      const caller = appRouter.createCaller(adminContext);

      const result = await caller.systemSettings.updateReservationSettings({
        enabled: true,
        closureMessage: '',
      });

      expect(result.success).toBe(true);

      // Verify via public API
      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsEnabled).toBe(true);
    });

    it('should update closure message independently', async () => {
      const caller = appRouter.createCaller(adminContext);

      await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'First message',
      });

      await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'Updated message',
      });

      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsClosureMessage).toBe('Updated message');
      expect(settings.reservationsEnabled).toBe(false);
    });
  });

  describe('updateEventsSettings', () => {
    it('should require admin authentication', async () => {
      const caller = appRouter.createCaller({ user: null });

      await expect(
        caller.systemSettings.updateEventsSettings({
          enabled: false,
          closureMessage: 'Test message',
        })
      ).rejects.toThrow();
    });

    it('should allow admin to disable events', async () => {
      const caller = appRouter.createCaller(adminContext);

      const result = await caller.systemSettings.updateEventsSettings({
        enabled: false,
        closureMessage: 'Not accepting events during holiday season',
      });

      expect(result.success).toBe(true);

      // Verify via public API
      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.eventsEnabled).toBe(false);
      expect(settings.eventsClosureMessage).toBe('Not accepting events during holiday season');
    });

    it('should allow admin to enable events', async () => {
      const caller = appRouter.createCaller(adminContext);

      const result = await caller.systemSettings.updateEventsSettings({
        enabled: true,
        closureMessage: '',
      });

      expect(result.success).toBe(true);

      // Verify via public API
      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.eventsEnabled).toBe(true);
    });
  });

  describe('Independent Settings', () => {
    it('should allow independent control of reservations and events', async () => {
      const caller = appRouter.createCaller(adminContext);

      // Disable reservations, enable events
      await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'Reservations closed',
      });

      await caller.systemSettings.updateEventsSettings({
        enabled: true,
        closureMessage: '',
      });

      let settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsEnabled).toBe(false);
      expect(settings.eventsEnabled).toBe(true);

      // Reverse it
      await caller.systemSettings.updateReservationSettings({
        enabled: true,
        closureMessage: '',
      });

      await caller.systemSettings.updateEventsSettings({
        enabled: false,
        closureMessage: 'Events closed',
      });

      settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsEnabled).toBe(true);
      expect(settings.eventsEnabled).toBe(false);
    });

    it('should maintain separate closure messages', async () => {
      const caller = appRouter.createCaller(adminContext);

      await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'Reservation closure message',
      });

      await caller.systemSettings.updateEventsSettings({
        enabled: false,
        closureMessage: 'Events closure message',
      });

      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsClosureMessage).toBe('Reservation closure message');
      expect(settings.eventsClosureMessage).toBe('Events closure message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long closure messages', async () => {
      const caller = appRouter.createCaller(adminContext);
      const longMessage = 'A'.repeat(500);

      const result = await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: longMessage,
      });

      expect(result.success).toBe(true);

      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsClosureMessage).toBe(longMessage);
    });

    it('should handle special characters in closure messages', async () => {
      const caller = appRouter.createCaller(adminContext);
      const specialMessage = 'Closed! @#$%^&*() "quotes" \'apostrophes\' <html>';

      const result = await caller.systemSettings.updateEventsSettings({
        enabled: false,
        closureMessage: specialMessage,
      });

      expect(result.success).toBe(true);

      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.eventsClosureMessage).toBe(specialMessage);
    });

    it('should handle rapid toggle changes', async () => {
      const caller = appRouter.createCaller(adminContext);

      // Rapidly toggle reservations
      await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'Closed',
      });

      await caller.systemSettings.updateReservationSettings({
        enabled: true,
        closureMessage: '',
      });

      await caller.systemSettings.updateReservationSettings({
        enabled: false,
        closureMessage: 'Closed again',
      });

      const settings = await caller.systemSettings.getPublicSettings();
      expect(settings.reservationsEnabled).toBe(false);
      expect(settings.reservationsClosureMessage).toBe('Closed again');
    });
  });
});
