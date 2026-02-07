import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

describe('Role-Based Login Access Control', () => {
  let testUsers: any[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test users with different roles
    const roles = ['admin', 'owner', 'manager', 'kitchen_staff', 'front_desk'];
    const hashedPassword = await bcrypt.hash('test123', 10);

    for (const role of roles) {
      const email = `test-${role}-${Date.now()}@example.com`;
      await db.insert(users).values({
        email,
        name: `Test ${role}`,
        openId: `test-${role}-${Date.now()}`,
        loginMethod: 'password',
        role: role as any,
        status: 'active',
        password: hashedPassword,
      });
      
      testUsers.push({ email, role, plainPassword: 'test123' });
    }
  });

  it('should allow admin role to login', async () => {
    const adminUser = testUsers.find(u => u.role === 'admin');
    const caller = appRouter.createCaller({
      user: null,
      req: {
        headers: {},
        protocol: 'https',
      } as any,
      res: {
        cookie: () => {},
      } as any,
    });

    const result = await caller.auth.login({
      email: adminUser.email,
      password: 'test123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('admin');
  });

  it('should allow owner role to login', async () => {
    const ownerUser = testUsers.find(u => u.role === 'owner');
    const caller = appRouter.createCaller({
      user: null,
      req: {
        headers: {},
        protocol: 'https',
      } as any,
      res: {
        cookie: () => {},
      } as any,
    });

    const result = await caller.auth.login({
      email: ownerUser.email,
      password: 'test123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('owner');
  });

  it('should allow manager role to login', async () => {
    const managerUser = testUsers.find(u => u.role === 'manager');
    const caller = appRouter.createCaller({
      user: null,
      req: {
        headers: {},
        protocol: 'https',
      } as any,
      res: {
        cookie: () => {},
      } as any,
    });

    const result = await caller.auth.login({
      email: managerUser.email,
      password: 'test123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('manager');
  });

  it('should allow kitchen_staff role to login', async () => {
    const kitchenUser = testUsers.find(u => u.role === 'kitchen_staff');
    const caller = appRouter.createCaller({
      user: null,
      req: {
        headers: {},
        protocol: 'https',
      } as any,
      res: {
        cookie: () => {},
      } as any,
    });

    const result = await caller.auth.login({
      email: kitchenUser.email,
      password: 'test123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('kitchen_staff');
  });

  it('should allow front_desk role to login', async () => {
    const frontDeskUser = testUsers.find(u => u.role === 'front_desk');
    const caller = appRouter.createCaller({
      user: null,
      req: {
        headers: {},
        protocol: 'https',
      } as any,
      res: {
        cookie: () => {},
      } as any,
    });

    const result = await caller.auth.login({
      email: frontDeskUser.email,
      password: 'test123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('front_desk');
  });

  it('should reject invalid credentials', async () => {
    const adminUser = testUsers.find(u => u.role === 'admin');
    const caller = appRouter.createCaller({
      user: null,
      req: {
        headers: {},
        protocol: 'https',
      } as any,
      res: {
        cookie: () => {},
      } as any,
    });

    await expect(caller.auth.login({
      email: adminUser.email,
      password: 'wrong-password',
    })).rejects.toThrow('Invalid email or password');
  });
});
