import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import bcrypt from 'bcrypt';

describe('Add Admin User (Direct Creation)', () => {
  const testEmail = `test-admin-${Date.now()}@example.com`;
  let ownerUserId: number;

  beforeEach(async () => {
    const db = getDb();
    
    // Clean up test data
    await db.execute('DELETE FROM users WHERE email = ?', [testEmail]);
    
    // Create owner user for context
    const hashedPassword = await bcrypt.hash('OwnerPassword123!', 10);
    const result = await db.execute(
      `INSERT INTO users (openId, email, name, role, password_hash, is_setup_complete, createdAt, updatedAt, lastSignedIn) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [`owner-${Date.now()}`, 'owner@test.com', 'Test Owner', 'owner', hashedPassword, true]
    );
    ownerUserId = Number(result.insertId);
  });

  it('should create admin user directly without sending email', async () => {
    const caller = appRouter.createCaller({ 
      user: { 
        id: ownerUserId, 
        email: 'owner@test.com', 
        name: 'Test Owner', 
        role: 'owner' 
      } as any 
    });
    
    const result = await caller.adminUsers.addAdminUser({
      email: testEmail,
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePassword123!',
      role: 'admin',
      phone: '1234567890',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('created successfully');

    // Verify user was created in database
    const db = getDb();
    const [user] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [testEmail]
    );
    
    expect(user).toBeDefined();
    expect((user as any).firstName).toBe('John');
    expect((user as any).lastName).toBe('Doe');
    expect((user as any).role).toBe('admin');
    expect((user as any).status).toBe('active');
    expect((user as any).is_setup_complete).toBe(1);
    
    // Verify password was hashed correctly
    const passwordMatch = await bcrypt.compare('SecurePassword123!', (user as any).password_hash);
    expect(passwordMatch).toBe(true);
  });

  it('should reject duplicate email', async () => {
    const caller = appRouter.createCaller({ 
      user: { 
        id: ownerUserId, 
        email: 'owner@test.com', 
        name: 'Test Owner', 
        role: 'owner' 
      } as any 
    });
    
    // Create first user
    await caller.adminUsers.addAdminUser({
      email: testEmail,
      firstName: 'First',
      lastName: 'User',
      password: 'Password123!',
      role: 'admin',
    });

    // Try to create second user with same email
    await expect(
      caller.adminUsers.addAdminUser({
        email: testEmail,
        firstName: 'Second',
        lastName: 'User',
        password: 'Password456!',
        role: 'manager',
      })
    ).rejects.toThrow('already exists');
  });

  it('should enforce minimum password length', async () => {
    const caller = appRouter.createCaller({ 
      user: { 
        id: ownerUserId, 
        email: 'owner@test.com', 
        name: 'Test Owner', 
        role: 'owner' 
      } as any 
    });
    
    // Try to create user with short password (less than 8 characters)
    await expect(
      caller.adminUsers.addAdminUser({
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        password: 'Short1', // Only 6 characters
        role: 'admin',
      })
    ).rejects.toThrow();
  });

  it('should create user with different roles', async () => {
    const caller = appRouter.createCaller({ 
      user: { 
        id: ownerUserId, 
        email: 'owner@test.com', 
        name: 'Test Owner', 
        role: 'owner' 
      } as any 
    });
    
    const roles = ['admin', 'manager', 'kitchen_staff', 'front_desk'];
    
    for (const role of roles) {
      const email = `${role}-${Date.now()}@example.com`;
      const result = await caller.adminUsers.addAdminUser({
        email,
        firstName: 'Test',
        lastName: role,
        password: 'Password123!',
        role,
      });

      expect(result.success).toBe(true);

      // Verify role was set correctly
      const db = getDb();
      const [user] = await db.execute(
        'SELECT role FROM users WHERE email = ?',
        [email]
      );
      
      expect((user as any).role).toBe(role);
      
      // Clean up
      await db.execute('DELETE FROM users WHERE email = ?', [email]);
    }
  });

  it('should hash password securely', async () => {
    const caller = appRouter.createCaller({ 
      user: { 
        id: ownerUserId, 
        email: 'owner@test.com', 
        name: 'Test Owner', 
        role: 'owner' 
      } as any 
    });
    
    const plainPassword = 'MySecurePassword123!';
    
    await caller.adminUsers.addAdminUser({
      email: testEmail,
      firstName: 'Test',
      lastName: 'User',
      password: plainPassword,
      role: 'admin',
    });

    // Get hashed password from database
    const db = getDb();
    const [user] = await db.execute(
      'SELECT password_hash FROM users WHERE email = ?',
      [testEmail]
    );
    
    const hashedPassword = (user as any).password_hash;
    
    // Verify password is hashed (not stored in plain text)
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
    
    // Verify hash can be verified
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    expect(isValid).toBe(true);
  });
});
