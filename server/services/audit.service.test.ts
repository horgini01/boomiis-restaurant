import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { logAuditAction, getIpAddress, createChangesObject } from './audit.service';
import { eq, desc } from 'drizzle-orm';

describe('Audit Service', () => {
  describe('logAuditAction', () => {
    it('should log an audit action to the database', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Log a test action
      await logAuditAction({
        userId: 1,
        userName: 'Test User',
        userRole: 'admin',
        action: 'create',
        entityType: 'menu_item',
        entityId: 123,
        entityName: 'Test Item',
        changes: { name: { before: null, after: 'Test Item' } },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Verify the log was created
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, '123'))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBe(1);
      expect(logs[0].userName).toBe('Test User');
      expect(logs[0].userRole).toBe('admin');
      expect(logs[0].action).toBe('create');
      expect(logs[0].entityType).toBe('menu_item');
      expect(logs[0].entityId).toBe('123');
      expect(logs[0].entityName).toBe('Test Item');
      expect(logs[0].ipAddress).toBe('192.168.1.1');
      expect(logs[0].userAgent).toBe('Mozilla/5.0');

      // Verify changes are stored as JSON
      const changes = JSON.parse(logs[0].changes!);
      expect(changes.name.before).toBe(null);
      expect(changes.name.after).toBe('Test Item');

      // Cleanup
      await db.delete(auditLogs).where(eq(auditLogs.id, logs[0].id));
    });

    it('should handle missing optional fields', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Log action without optional fields
      await logAuditAction({
        userId: 2,
        userName: 'Another User',
        userRole: 'manager',
        action: 'delete',
        entityType: 'order',
      });

      // Verify the log was created with null optional fields
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, 2))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      expect(logs.length).toBe(1);
      expect(logs[0].entityId).toBe(null);
      expect(logs[0].entityName).toBe(null);
      expect(logs[0].changes).toBe(null);
      expect(logs[0].ipAddress).toBe(null);
      expect(logs[0].userAgent).toBe(null);

      // Cleanup
      await db.delete(auditLogs).where(eq(auditLogs.id, logs[0].id));
    });
  });

  describe('getIpAddress', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1',
      };
      expect(getIpAddress(headers)).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = {
        'x-real-ip': '203.0.113.2',
      };
      expect(getIpAddress(headers)).toBe('203.0.113.2');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const headers = {
        'cf-connecting-ip': '203.0.113.3',
      };
      expect(getIpAddress(headers)).toBe('203.0.113.3');
    });

    it('should return undefined if no IP headers present', () => {
      const headers = {};
      expect(getIpAddress(headers)).toBe(undefined);
    });

    it('should handle array header values', () => {
      const headers = {
        'x-forwarded-for': ['203.0.113.4', '198.51.100.2'],
      };
      expect(getIpAddress(headers)).toBe('203.0.113.4');
    });
  });

  describe('createChangesObject', () => {
    it('should track changes between before and after objects', () => {
      const before = {
        name: 'Old Name',
        price: 10.99,
        isActive: true,
      };
      const after = {
        name: 'New Name',
        price: 12.99,
        isActive: true,
      };

      const changes = createChangesObject(before, after);

      expect(Object.keys(changes)).toHaveLength(2);
      expect(changes.name).toEqual({ before: 'Old Name', after: 'New Name' });
      expect(changes.price).toEqual({ before: 10.99, after: 12.99 });
      expect(changes.isActive).toBeUndefined(); // No change
    });

    it('should only track specified fields when provided', () => {
      const before = {
        name: 'Old Name',
        price: 10.99,
        isActive: true,
        description: 'Old Description',
      };
      const after = {
        name: 'New Name',
        price: 12.99,
        isActive: false,
        description: 'New Description',
      };

      const changes = createChangesObject(before, after, ['name', 'price']);

      expect(Object.keys(changes)).toHaveLength(2);
      expect(changes.name).toBeDefined();
      expect(changes.price).toBeDefined();
      expect(changes.isActive).toBeUndefined();
      expect(changes.description).toBeUndefined();
    });

    it('should return empty object when no changes detected', () => {
      const before = { name: 'Same Name', price: 10.99 };
      const after = { name: 'Same Name', price: 10.99 };

      const changes = createChangesObject(before, after);

      expect(Object.keys(changes)).toHaveLength(0);
    });

    it('should handle new fields in after object', () => {
      const before = { name: 'Name' };
      const after = { name: 'Name', newField: 'New Value' };

      const changes = createChangesObject(before, after);

      expect(changes.newField).toEqual({ before: undefined, after: 'New Value' });
    });

    it('should handle removed fields from before object', () => {
      const before = { name: 'Name', oldField: 'Old Value' };
      const after = { name: 'Name' };

      const changes = createChangesObject(before, after);

      expect(changes.oldField).toEqual({ before: 'Old Value', after: undefined });
    });
  });
});
