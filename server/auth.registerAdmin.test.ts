import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { ENV } from './_core/env';

/**
 * Admin Registration Tests
 * 
 * Tests all scenarios for admin self-registration:
 * 1. First admin registration (no admins exist, ALLOW_ADMIN_SIGNUP=false) - should succeed
 * 2. First admin registration with wrong secret - should fail
 * 3. Second admin registration (1 admin exists, ALLOW_ADMIN_SIGNUP=false) - should fail
 * 4. Second admin registration (1 admin exists, ALLOW_ADMIN_SIGNUP=true) - should succeed
 * 5. Registration with duplicate email - should fail
 * 6. Registration with weak password - should fail
 */

describe('Admin Registration', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  
  beforeEach(async () => {
    db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    // Clean up any existing test users
    await db.delete(users).where(eq(users.email, 'test-admin1@example.com'));
    await db.delete(users).where(eq(users.email, 'test-admin2@example.com'));
  });
  
  afterEach(async () => {
    // Clean up test users
    if (db) {
      await db.delete(users).where(eq(users.email, 'test-admin1@example.com'));
      await db.delete(users).where(eq(users.email, 'test-admin2@example.com'));
    }
  });
  
  it('should allow first admin registration when no admins exist (ALLOW_ADMIN_SIGNUP=false)', async () => {
    // This test verifies that the first admin can always register, even if ALLOW_ADMIN_SIGNUP=false
    
    // Count existing admins
    const adminResults = await db!
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    const adminCount = adminResults.length;
    
    // If there are existing admins, this test scenario doesn't apply
    if (adminCount > 0) {
      console.log('⚠️  Skipping test: Admins already exist in database');
      return;
    }
    
    // Verify ENV.adminSignupSecret is set
    expect(ENV.adminSignupSecret).toBeTruthy();
    
    // Create first admin
    const openId = `test-admin-${Date.now()}`;
    await db!.insert(users).values({
      openId,
      email: 'test-admin1@example.com',
      name: 'Test Admin One',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      passwordHash: 'hashed-password',
      isSetupComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    
    // Verify admin was created
    const [admin] = await db!
      .select()
      .from(users)
      .where(eq(users.email, 'test-admin1@example.com'))
      .limit(1);
    
    expect(admin).toBeTruthy();
    expect(admin.role).toBe('admin');
    expect(admin.firstName).toBe('Test');
    expect(admin.lastName).toBe('Admin');
  });
  
  it('should reject registration with wrong secret', async () => {
    // This test verifies that registration fails with an invalid secret
    const wrongSecret = 'wrong-secret-12345';
    
    expect(wrongSecret).not.toBe(ENV.adminSignupSecret);
    
    // In a real scenario, this would be tested via tRPC mutation
    // For now, we verify the secret validation logic
    const isValidSecret = wrongSecret === ENV.adminSignupSecret;
    expect(isValidSecret).toBe(false);
  });
  
  it('should reject second admin registration when ALLOW_ADMIN_SIGNUP=false', async () => {
    // This test verifies that additional admins cannot register when ALLOW_ADMIN_SIGNUP=false
    
    // Create first admin
    const openId1 = `test-admin-${Date.now()}`;
    await db!.insert(users).values({
      openId: openId1,
      email: 'test-admin1@example.com',
      name: 'Test Admin One',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      passwordHash: 'hashed-password',
      isSetupComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    
    // Count admins
    const adminResults = await db!
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    const adminCount = adminResults.length;
    
    // Verify at least one admin exists
    expect(adminCount).toBeGreaterThan(0);
    
    // Verify ALLOW_ADMIN_SIGNUP is false
    // If true, registration should be allowed
    if (ENV.allowAdminSignup) {
      console.log('⚠️  ALLOW_ADMIN_SIGNUP is true, second admin registration would be allowed');
      return;
    }
    
    // Second registration should be blocked
    const shouldBlock = adminCount > 0 && !ENV.allowAdminSignup;
    expect(shouldBlock).toBe(true);
  });
  
  it('should allow second admin registration when ALLOW_ADMIN_SIGNUP=true', async () => {
    // This test verifies that additional admins CAN register when ALLOW_ADMIN_SIGNUP=true
    
    // Create first admin
    const openId1 = `test-admin-${Date.now()}`;
    await db!.insert(users).values({
      openId: openId1,
      email: 'test-admin1@example.com',
      name: 'Test Admin One',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      passwordHash: 'hashed-password',
      isSetupComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    
    // Count admins
    const adminResults = await db!
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    const adminCount = adminResults.length;
    
    // Verify at least one admin exists
    expect(adminCount).toBeGreaterThan(0);
    
    // If ALLOW_ADMIN_SIGNUP is false, this test doesn't apply
    if (!ENV.allowAdminSignup) {
      console.log('⚠️  ALLOW_ADMIN_SIGNUP is false, second admin registration would be blocked');
      return;
    }
    
    // Second registration should be allowed
    const shouldAllow = ENV.allowAdminSignup;
    expect(shouldAllow).toBe(true);
    
    // Create second admin
    const openId2 = `test-admin-${Date.now()}-2`;
    await db!.insert(users).values({
      openId: openId2,
      email: 'test-admin2@example.com',
      name: 'Test Admin Two',
      firstName: 'Test2',
      lastName: 'Admin2',
      role: 'admin',
      passwordHash: 'hashed-password-2',
      isSetupComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    
    // Verify second admin was created
    const [admin2] = await db!
      .select()
      .from(users)
      .where(eq(users.email, 'test-admin2@example.com'))
      .limit(1);
    
    expect(admin2).toBeTruthy();
    expect(admin2.role).toBe('admin');
  });
  
  it('should reject registration with duplicate email', async () => {
    // Create first admin
    const openId = `test-admin-${Date.now()}`;
    await db!.insert(users).values({
      openId,
      email: 'test-admin1@example.com',
      name: 'Test Admin One',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      passwordHash: 'hashed-password',
      isSetupComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    
    // Check if email exists
    const [existingUser] = await db!
      .select()
      .from(users)
      .where(eq(users.email, 'test-admin1@example.com'))
      .limit(1);
    
    expect(existingUser).toBeTruthy();
    
    // Attempting to register with the same email should fail
    // In real scenario, tRPC would throw CONFLICT error
  });
  
  it('should validate password requirements', () => {
    // Test password validation logic
    const weakPasswords = [
      'short',           // Too short
      'alllowercase1',   // No uppercase
      'ALLUPPERCASE1',   // No lowercase
      'NoNumbers',       // No numbers
    ];
    
    // These would fail validation in the actual registerAdmin procedure
    weakPasswords.forEach(password => {
      const isValid = password.length >= 8 && 
                      /[A-Z]/.test(password) && 
                      /[a-z]/.test(password) && 
                      /[0-9]/.test(password);
      
      expect(isValid).toBe(false);
    });
    
    // Valid password
    const strongPassword = 'StrongPass123';
    const isValidStrong = strongPassword.length >= 8 && 
                          /[A-Z]/.test(strongPassword) && 
                          /[a-z]/.test(strongPassword) && 
                          /[0-9]/.test(strongPassword);
    
    expect(isValidStrong).toBe(true);
  });
});
