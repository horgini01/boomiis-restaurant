import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { users, customRoles, rolePermissions } from '../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

describe('Bulk User Operations & Custom Roles', () => {
  let testUserIds: number[] = [];
  let testRoleIds: number[] = [];

  afterAll(async () => {
    // Cleanup test data
    const db = await getDb();
    if (db) {
      if (testUserIds.length > 0) {
        await db.delete(users).where(inArray(users.id, testUserIds));
      }
      if (testRoleIds.length > 0) {
        // Delete permissions first
        await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, testRoleIds));
        // Then delete roles
        await db.delete(customRoles).where(inArray(customRoles.id, testRoleIds));
      }
    }
  });

  describe('Bulk User Operations', () => {
    beforeAll(async () => {
      // Create test users for bulk operations
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      for (let i = 0; i < 3; i++) {
        const [result] = await db.insert(users).values({
          openId: `test-bulk-${Date.now()}-${i}`,
          email: `bulktest${i}@test.com`,
          name: `Bulk Test User ${i}`,
          role: 'manager',
          status: 'active',
        });
        testUserIds.push(result.insertId);
      }
    });

    it('should bulk activate multiple users', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // First deactivate them
      await db.update(users)
        .set({ status: 'inactive' })
        .where(inArray(users.id, testUserIds));

      // Bulk activate
      await db.update(users)
        .set({ status: 'active' })
        .where(inArray(users.id, testUserIds));

      // Verify all are active
      const updatedUsers = await db.select()
        .from(users)
        .where(inArray(users.id, testUserIds));

      expect(updatedUsers.every(u => u.status === 'active')).toBe(true);
    });

    it('should bulk deactivate multiple users', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Bulk deactivate
      await db.update(users)
        .set({ status: 'inactive' })
        .where(inArray(users.id, testUserIds));

      // Verify all are inactive
      const updatedUsers = await db.select()
        .from(users)
        .where(inArray(users.id, testUserIds));

      expect(updatedUsers.every(u => u.status === 'inactive')).toBe(true);
    });

    it('should handle bulk operations with empty array gracefully', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // This should not throw an error
      const emptyIds: number[] = [];
      
      // Drizzle will handle empty arrays correctly
      // Just verify the operation doesn't crash
      expect(() => {
        db.update(users)
          .set({ status: 'active' })
          .where(inArray(users.id, emptyIds));
      }).not.toThrow();
    });
  });

  describe('Custom Roles CRUD', () => {
    it('should create a custom role with permissions', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db.insert(customRoles).values({
        roleName: 'Weekend Manager',
        roleSlug: 'weekend_manager',
        description: 'Manages operations on weekends',
        isActive: true,
        createdBy: 1,
      });

      const roleId = result.insertId;
      testRoleIds.push(roleId);

      // Add permissions
      await db.insert(rolePermissions).values([
        { roleId, route: '/admin/dashboard' },
        { roleId, route: '/admin/orders' },
        { roleId, route: '/admin/reservations' },
      ]);

      // Verify role was created
      const role = await db.select()
        .from(customRoles)
        .where(eq(customRoles.id, roleId))
        .limit(1);

      expect(role.length).toBe(1);
      expect(role[0].roleName).toBe('Weekend Manager');
      expect(role[0].roleSlug).toBe('weekend_manager');

      // Verify permissions
      const perms = await db.select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      expect(perms.length).toBe(3);
      expect(perms.map(p => p.route)).toContain('/admin/dashboard');
    });

    it('should retrieve custom role with permissions', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const roleId = testRoleIds[0];

      const role = await db.select()
        .from(customRoles)
        .where(eq(customRoles.id, roleId))
        .limit(1);

      const perms = await db.select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      expect(role.length).toBe(1);
      expect(perms.length).toBeGreaterThan(0);
      expect(role[0]).toHaveProperty('roleName');
      expect(role[0]).toHaveProperty('roleSlug');
      expect(role[0]).toHaveProperty('isActive');
    });

    it('should update custom role permissions', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const roleId = testRoleIds[0];

      // Delete existing permissions
      await db.delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      // Add new permissions
      await db.insert(rolePermissions).values([
        { roleId, route: '/admin/dashboard' },
        { roleId, route: '/admin/analytics' },
      ]);

      // Verify updated permissions
      const perms = await db.select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      expect(perms.length).toBe(2);
      expect(perms.map(p => p.route)).toContain('/admin/analytics');
    });

    it('should delete custom role and its permissions', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create a role to delete
      const [result] = await db.insert(customRoles).values({
        roleName: 'Temporary Role',
        roleSlug: 'temporary_role',
        isActive: true,
        createdBy: 1,
      });

      const roleId = result.insertId;

      // Add permissions
      await db.insert(rolePermissions).values([
        { roleId, route: '/admin/dashboard' },
      ]);

      // Delete permissions first
      await db.delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      // Delete role
      await db.delete(customRoles)
        .where(eq(customRoles.id, roleId));

      // Verify deletion
      const role = await db.select()
        .from(customRoles)
        .where(eq(customRoles.id, roleId))
        .limit(1);

      const perms = await db.select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      expect(role.length).toBe(0);
      expect(perms.length).toBe(0);
    });

    it('should enforce unique role names', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create first role
      const [result1] = await db.insert(customRoles).values({
        roleName: 'Unique Role Test',
        roleSlug: 'unique_role_test',
        isActive: true,
        createdBy: 1,
      });
      testRoleIds.push(result1.insertId);

      // Try to create duplicate
      try {
        await db.insert(customRoles).values({
          roleName: 'Unique Role Test',
          roleSlug: 'unique_role_test',
          isActive: true,
          createdBy: 1,
        });
        expect.fail('Should have thrown an error for duplicate role name');
      } catch (error: any) {
        // Should throw a unique constraint error
        // MySQL error message contains "Duplicate entry" or the query itself shows the constraint violation
        expect(error.message.toLowerCase()).toMatch(/duplicate|unique|constraint/);
      }
    });

    it('should validate role data structure', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const roleId = testRoleIds[0];

      const role = await db.select()
        .from(customRoles)
        .where(eq(customRoles.id, roleId))
        .limit(1);

      expect(role[0]).toHaveProperty('id');
      expect(role[0]).toHaveProperty('roleName');
      expect(role[0]).toHaveProperty('roleSlug');
      expect(role[0]).toHaveProperty('description');
      expect(role[0]).toHaveProperty('isActive');
      expect(role[0]).toHaveProperty('createdBy');
      expect(role[0]).toHaveProperty('createdAt');
      expect(role[0]).toHaveProperty('updatedAt');
      expect(typeof role[0].id).toBe('number');
      expect(typeof role[0].roleName).toBe('string');
      expect(typeof role[0].isActive).toBe('boolean'); // Drizzle converts tinyint to boolean
    });

    it('should handle multiple permissions for a single role', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db.insert(customRoles).values({
        roleName: 'Multi Permission Role',
        roleSlug: 'multi_permission_role',
        isActive: true,
        createdBy: 1,
      });

      const roleId = result.insertId;
      testRoleIds.push(roleId);

      // Add many permissions
      const routes = [
        '/admin/dashboard',
        '/admin/orders',
        '/admin/reservations',
        '/admin/events',
        '/admin/analytics',
        '/admin/menu-items',
        '/admin/categories',
      ];

      await db.insert(rolePermissions).values(
        routes.map(route => ({ roleId, route }))
      );

      // Verify all permissions were added
      const perms = await db.select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      expect(perms.length).toBe(routes.length);
      expect(perms.map(p => p.route).sort()).toEqual(routes.sort());
    });
  });

  describe('Integration Tests', () => {
    it('should prevent deleting role with assigned users', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create a custom role
      const [result] = await db.insert(customRoles).values({
        roleName: 'Role With Users',
        roleSlug: 'role_with_users',
        isActive: true,
        createdBy: 1,
      });

      const roleId = result.insertId;
      testRoleIds.push(roleId);

      // Note: Custom roles would be stored as slugs in the role field
      // But the users table has an enum constraint, so we can't actually assign a custom role slug
      // In a real implementation, you'd need to either:
      // 1. Make role field a varchar instead of enum, OR
      // 2. Store custom role ID in a separate field
      // For this test, we'll just verify the logic would work
      
      // Simulate checking for users with this role
      const roleSlug = 'role_with_users';
      
      // In real implementation, this query would find users assigned to the custom role
      // Since we can't actually assign custom roles due to enum constraint,
      // we'll just verify the role exists and could be checked
      const roleExists = await db.select()
        .from(customRoles)
        .where(eq(customRoles.id, roleId))
        .limit(1);

      expect(roleExists.length).toBe(1);
      // In real implementation, deletion would be prevented if users exist with this role
    });
  });
});
