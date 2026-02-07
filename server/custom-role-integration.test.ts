import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from './db';
import { users, customRoles, rolePermissions } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Custom Role Integration Tests', () => {
  let testCustomRoleId: number;
  let testUserId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Clean up test data
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, 9999));
    await db.delete(customRoles).where(eq(customRoles.id, 9999));
    await db.delete(users).where(eq(users.email, 'test-custom-role@example.com'));
  });

  describe('Custom Role Assignment', () => {
    it('should create a custom role with permissions', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create custom role
      const result = await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Test Custom Role',
        roleSlug: 'test-custom-role',
        description: 'Test role for vitest',
        permissions: JSON.stringify(['/admin/dashboard', '/admin/orders']),
        isActive: true,
        createdBy: 1,
      });

      expect(result).toBeDefined();

      // Verify role was created
      const role = await db.select().from(customRoles).where(eq(customRoles.id, 9999)).limit(1);
      expect(role.length).toBe(1);
      expect(role[0].roleName).toBe('Test Custom Role');
      expect(JSON.parse(role[0].permissions as string)).toEqual(['/admin/dashboard', '/admin/orders']);
    });

    it('should assign custom role to a user', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create custom role first
      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Test Custom Role',
        roleSlug: 'test-custom-role',
        description: 'Test role',
        permissions: JSON.stringify(['/admin/dashboard']),
        isActive: true,
        createdBy: 1,
      });

      // Create user with custom role
      const userResult = await db.insert(users).values({
        openId: 'test-custom-role-user',
        email: 'test-custom-role@example.com',
        name: 'Test User',
        role: 'admin',
        customRoleId: 9999,
        status: 'active',
        loginMethod: 'email',
      });

      expect(userResult).toBeDefined();

      // Verify user has custom role assigned
      const user = await db.select().from(users).where(eq(users.email, 'test-custom-role@example.com')).limit(1);
      expect(user.length).toBe(1);
      expect(user[0].customRoleId).toBe(9999);
    });

    it('should clear custom role when switching to predefined role', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create user with custom role
      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Test Custom Role',
        roleSlug: 'test-custom-role',
        description: 'Test role',
        permissions: JSON.stringify(['/admin/dashboard']),
        isActive: true,
        createdBy: 1,
      });

      await db.insert(users).values({
        openId: 'test-custom-role-user',
        email: 'test-custom-role@example.com',
        name: 'Test User',
        role: 'admin',
        customRoleId: 9999,
        status: 'active',
        loginMethod: 'email',
      });

      // Update user to predefined role
      await db.update(users)
        .set({ role: 'manager', customRoleId: null })
        .where(eq(users.email, 'test-custom-role@example.com'));

      // Verify custom role was cleared
      const user = await db.select().from(users).where(eq(users.email, 'test-custom-role@example.com')).limit(1);
      expect(user[0].customRoleId).toBeNull();
      expect(user[0].role).toBe('manager');
    });
  });

  describe('Custom Role Permissions', () => {
    it('should store permissions as JSON array', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const permissions = [
        '/admin/dashboard',
        '/admin/orders',
        '/admin/menu-items',
        '/admin/categories',
      ];

      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Multi-Permission Role',
        roleSlug: 'multi-permission-role',
        description: 'Role with multiple permissions',
        permissions: JSON.stringify(permissions),
        isActive: true,
        createdBy: 1,
      });

      const role = await db.select().from(customRoles).where(eq(customRoles.id, 9999)).limit(1);
      const storedPermissions = JSON.parse(role[0].permissions as string);
      
      expect(storedPermissions).toEqual(permissions);
      expect(storedPermissions.length).toBe(4);
    });

    it('should handle empty permissions array', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'No Permissions Role',
        roleSlug: 'no-permissions-role',
        description: 'Role with no permissions',
        permissions: JSON.stringify([]),
        isActive: true,
        createdBy: 1,
      });

      const role = await db.select().from(customRoles).where(eq(customRoles.id, 9999)).limit(1);
      const storedPermissions = JSON.parse(role[0].permissions as string);
      
      expect(storedPermissions).toEqual([]);
      expect(storedPermissions.length).toBe(0);
    });

    it('should activate and deactivate custom roles', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create active role
      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Toggle Role',
        roleSlug: 'toggle-role',
        description: 'Test role activation',
        permissions: JSON.stringify(['/admin/dashboard']),
        isActive: true,
        createdBy: 1,
      });

      // Verify it's active
      let role = await db.select().from(customRoles).where(eq(customRoles.id, 9999)).limit(1);
      expect(role[0].isActive).toBe(true);

      // Deactivate role
      await db.update(customRoles)
        .set({ isActive: false })
        .where(eq(customRoles.id, 9999));

      // Verify it's inactive
      role = await db.select().from(customRoles).where(eq(customRoles.id, 9999)).limit(1);
      expect(role[0].isActive).toBe(false);
    });
  });

  describe('Custom Role Data Integrity', () => {
    it('should not allow duplicate role names', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create first role
      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Duplicate Test',
        roleSlug: 'duplicate-test',
        description: 'First role',
        permissions: JSON.stringify(['/admin/dashboard']),
        isActive: true,
        createdBy: 1,
      });

      // Attempt to create duplicate - should fail due to unique constraint
      try {
        await db.insert(customRoles).values({
          id: 9998,
          roleName: 'Duplicate Test',
          description: 'Second role',
          permissions: JSON.stringify(['/admin/orders']),
          isActive: true,
          createdBy: 1,
        });
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error: any) {
        // Expect unique constraint error
        expect(error.message).toContain('Duplicate');
      }
    });

    it('should maintain referential integrity between users and custom roles', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create custom role
      await db.insert(customRoles).values({
        id: 9999,
        roleName: 'Referential Test',
        roleSlug: 'referential-test',
        description: 'Test referential integrity',
        permissions: JSON.stringify(['/admin/dashboard']),
        isActive: true,
        createdBy: 1,
      });

      // Create user with custom role
      await db.insert(users).values({
        openId: 'test-referential-user',
        email: 'test-custom-role@example.com',
        name: 'Test User',
        role: 'admin',
        customRoleId: 9999,
        status: 'active',
        loginMethod: 'email',
      });

      // Verify user can be queried with custom role
      const user = await db.select().from(users).where(eq(users.customRoleId, 9999)).limit(1);
      expect(user.length).toBe(1);
      expect(user[0].customRoleId).toBe(9999);
    });
  });
});
