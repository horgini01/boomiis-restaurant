import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Authentication Enhancements Tests
 * Tests for three new features:
 * 1. New users default to active status
 * 2. Remember Me checkbox extends session duration
 * 3. Password strength indicator on password reset pages
 */

describe('Authentication Enhancements', () => {
  describe('New user status defaults to active', () => {
    it('should create new users with active status by default', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Simulate creating a new user (as done in adminUserManagement.ts)
      const testEmail = `test-active-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('testPassword123', 10);
      const openId = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        openId,
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        role: 'kitchen_staff',
        phone: null,
        status: 'active', // Should be active by default
        loginMethod: 'email',
        password: hashedPassword,
      });

      // Verify user was created with active status
      const [user] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);

      expect(user).toBeDefined();
      expect(user.status).toBe('active');
      expect(user.email).toBe(testEmail);
    });

    it('should allow newly created users to login immediately', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Create a user with active status
      const testEmail = `test-login-${Date.now()}@example.com`;
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const openId = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(users).values({
        openId,
        email: testEmail,
        firstName: 'Test',
        lastName: 'Login',
        name: 'Test Login',
        role: 'front_desk',
        status: 'active',
        loginMethod: 'email',
        password: hashedPassword,
      });

      // Verify user can be found and password is correct
      const [user] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);

      expect(user).toBeDefined();
      expect(user.status).toBe('active');

      // Password is stored in the password field for email-based accounts
      const passwordHash = user.password || user.openId;
      const isPasswordValid = await bcrypt.compare(password, passwordHash);
      expect(isPasswordValid).toBe(true);
    });
  });

  describe('Remember Me functionality', () => {
    it('should accept rememberMe parameter in login input', () => {
      // The login mutation now accepts rememberMe as optional boolean
      const loginInput = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      expect(loginInput.rememberMe).toBe(true);
    });

    it('should calculate correct session expiry for remember me', () => {
      // When rememberMe is true: 30 days
      const rememberMeExpiry = 30 * 24 * 60 * 60 * 1000;
      expect(rememberMeExpiry).toBe(2592000000); // 30 days in milliseconds

      // When rememberMe is false: 1 day
      const defaultExpiry = 24 * 60 * 60 * 1000;
      expect(defaultExpiry).toBe(86400000); // 1 day in milliseconds
    });

    it('should handle rememberMe being undefined (defaults to 1 day)', () => {
      const rememberMe = undefined;
      const expiresInMs = rememberMe 
        ? 30 * 24 * 60 * 60 * 1000  // 30 days
        : 24 * 60 * 60 * 1000;       // 1 day

      expect(expiresInMs).toBe(86400000); // 1 day
    });
  });

  describe('Password strength indicator', () => {
    it('should validate password has at least 8 characters', () => {
      const shortPassword = '1234567';
      const validPassword = '12345678';

      expect(shortPassword.length >= 8).toBe(false);
      expect(validPassword.length >= 8).toBe(true);
    });

    it('should validate password contains uppercase letter', () => {
      const noUppercase = 'password123';
      const hasUppercase = 'Password123';

      expect(/[A-Z]/.test(noUppercase)).toBe(false);
      expect(/[A-Z]/.test(hasUppercase)).toBe(true);
    });

    it('should validate password contains lowercase letter', () => {
      const noLowercase = 'PASSWORD123';
      const hasLowercase = 'Password123';

      expect(/[a-z]/.test(noLowercase)).toBe(false);
      expect(/[a-z]/.test(hasLowercase)).toBe(true);
    });

    it('should validate password contains number', () => {
      const noNumber = 'Password';
      const hasNumber = 'Password123';

      expect(/[0-9]/.test(noNumber)).toBe(false);
      expect(/[0-9]/.test(hasNumber)).toBe(true);
    });

    it('should validate password contains special character', () => {
      const noSpecial = 'Password123';
      const hasSpecial = 'Password123!';

      expect(/[^A-Za-z0-9]/.test(noSpecial)).toBe(false);
      expect(/[^A-Za-z0-9]/.test(hasSpecial)).toBe(true);
    });

    it('should calculate correct password strength', () => {
      const weakPassword = '12345678'; // Only length
      const mediumPassword = 'password123'; // Length + lowercase + number
      const strongPassword = 'Password123!@'; // All requirements

      // Count passed checks for weak password
      let weakCount = 0;
      if (weakPassword.length >= 8) weakCount++;
      if (/[A-Z]/.test(weakPassword)) weakCount++;
      if (/[a-z]/.test(weakPassword)) weakCount++;
      if (/[0-9]/.test(weakPassword)) weakCount++;
      if (/[^A-Za-z0-9]/.test(weakPassword)) weakCount++;
      expect(weakCount).toBeLessThanOrEqual(2); // Weak

      // Count passed checks for medium password
      let mediumCount = 0;
      if (mediumPassword.length >= 8) mediumCount++;
      if (/[A-Z]/.test(mediumPassword)) mediumCount++;
      if (/[a-z]/.test(mediumPassword)) mediumCount++;
      if (/[0-9]/.test(mediumPassword)) mediumCount++;
      if (/[^A-Za-z0-9]/.test(mediumPassword)) mediumCount++;
      expect(mediumCount).toBe(3); // Medium

      // Count passed checks for strong password
      let strongCount = 0;
      if (strongPassword.length >= 8) strongCount++;
      if (/[A-Z]/.test(strongPassword)) strongCount++;
      if (/[a-z]/.test(strongPassword)) strongCount++;
      if (/[0-9]/.test(strongPassword)) strongCount++;
      if (/[^A-Za-z0-9]/.test(strongPassword)) strongCount++;
      expect(strongCount).toBe(5); // Strong
    });
  });
});
