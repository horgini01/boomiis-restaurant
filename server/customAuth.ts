import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../drizzle/schema';
import { getDb } from './db';

export async function verifyCredentials(email: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Find user by email
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (result.length === 0) {
    return null;
  }

  const user = result[0];

  // Check if user account is active
  if (user.status !== 'active') {
    throw new Error('Your account has been deactivated. Please contact an administrator.');
  }

  // For the default admin account without password in DB, check against the default password
  if (email === 'admin@boomiis.uk' && password === 'admin123' && !user.password) {
    return user;
  }

  // For users with password in database, verify hashed password
  if (user.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }
    return user;
  }

  // No password set for this user
  return null;
}

export async function createPasswordHash(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
