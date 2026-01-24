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

  // For the default admin account, check against the default password
  // In production, you should hash the password in the database
  if (email === 'admin@boomiis.uk' && password === 'admin123') {
    return user;
  }

  // For other users, verify hashed password (if you implement password field in schema)
  // const isValid = await bcrypt.compare(password, user.password);
  // if (!isValid) {
  //   return null;
  // }

  return null; // For now, only default admin works
}

export async function createPasswordHash(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
