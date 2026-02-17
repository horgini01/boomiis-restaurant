#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
// Import will be done via raw SQL instead
import { eq } from 'drizzle-orm';

const email = 'damysho2002@yahoo.com';
const newPassword = 'TempPass2026!';

async function resetPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔐 Resetting password for:', email);
  console.log('🔑 New temporary password:', newPassword);
  console.log('');

  let connection;
  try {
    // Parse DATABASE_URL
    const url = new URL(databaseUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.searchParams.get('ssl-mode') === 'REQUIRED' 
        ? { rejectUnauthorized: false } 
        : undefined,
    };

    // Connect to database
    connection = await mysql.createConnection(config);
    const db = drizzle(connection);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const result = await db
      .update(users)
      .set({
        password_hash: passwordHash,
        is_setup_complete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    console.log('✅ Password reset successful!');
    console.log('');
    console.log('📧 Email:', email);
    console.log('🔑 Temporary Password:', newPassword);
    console.log('');
    console.log('⚠️  Please log in and change this password immediately!');
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetPassword();
