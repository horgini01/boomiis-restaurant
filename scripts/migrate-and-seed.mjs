#!/usr/bin/env node
/**
 * Automatic Database Migration and Seeding Script
 * Runs on application startup to ensure database is properly initialized
 */

import { execSync } from 'child_process';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[Migration] DATABASE_URL environment variable is required');
  process.exit(1);
}

async function checkDatabaseExists() {
  try {
    // Parse DATABASE_URL to handle SSL parameters
    const dbUrl = new URL(DATABASE_URL);
    const sslMode = dbUrl.searchParams.get('ssl-mode');
    dbUrl.searchParams.delete('ssl-mode');
    
    if (sslMode === 'REQUIRED' || sslMode === 'required') {
      dbUrl.searchParams.set('ssl', JSON.stringify({ rejectUnauthorized: true }));
    }
    
    const db = drizzle(dbUrl.toString());
    
    // Try to query a table to see if database is initialized
    const result = await db.execute('SHOW TABLES');
    return result && result.length > 0;
  } catch (error) {
    console.log('[Migration] Database not initialized or connection failed:', error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('[Migration] Running database migrations...');
  try {
    execSync('pnpm drizzle-kit generate', { stdio: 'inherit' });
    execSync('pnpm drizzle-kit migrate', { stdio: 'inherit' });
    console.log('[Migration] ✅ Migrations completed successfully');
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    return false;
  }
}

async function seedDatabase() {
  console.log('[Migration] Seeding database with initial data...');
  try {
    // Seed settings
    execSync('node scripts/seed-settings.mjs', { stdio: 'inherit' });
    console.log('[Migration] ✅ Settings seeded');
    
    // Seed cookie policy
    execSync('node seed-cookie-policy.mjs', { stdio: 'inherit' });
    console.log('[Migration] ✅ Cookie policy seeded');
    
    // Seed menu (if exists)
    try {
      execSync('node scripts/seed-menu.mjs', { stdio: 'inherit' });
      console.log('[Migration] ✅ Menu seeded');
    } catch (error) {
      console.log('[Migration] ⚠️  Menu seeding skipped (optional)');
    }
    
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Seeding failed:', error.message);
    return false;
  }
}

async function createAdminAccount() {
  console.log('[Migration] Checking for admin account...');
  try {
    // Parse DATABASE_URL
    const dbUrl = new URL(DATABASE_URL);
    const sslMode = dbUrl.searchParams.get('ssl-mode');
    dbUrl.searchParams.delete('ssl-mode');
    
    if (sslMode === 'REQUIRED' || sslMode === 'required') {
      dbUrl.searchParams.set('ssl', JSON.stringify({ rejectUnauthorized: true }));
    }
    
    const db = drizzle(dbUrl.toString());
    
    // Check if any admin exists
    const admins = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    const adminCount = admins[0]?.count || 0;
    
    if (adminCount === 0) {
      console.log('[Migration] No admin account found. Creating default admin...');
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurant.com';
      const adminName = process.env.ADMIN_NAME || 'Admin';
      
      // Create admin account
      await db.execute(`
        INSERT INTO users (open_id, email, name, role, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', NOW(), NOW())
      `, [
        `admin-${Date.now()}`,
        adminEmail,
        adminName
      ]);
      
      console.log(`[Migration] ✅ Admin account created: ${adminEmail}`);
      console.log('[Migration] ⚠️  IMPORTANT: Set up authentication for this admin account');
    } else {
      console.log(`[Migration] ✅ Admin account exists (${adminCount} admin(s) found)`);
    }
    
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Admin account creation failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 RestaurantPro Database Initialization');
  console.log('='.repeat(60));
  
  const dbExists = await checkDatabaseExists();
  
  if (!dbExists) {
    console.log('[Migration] 📦 Fresh database detected. Running full setup...');
    
    // Run migrations
    const migrationSuccess = await runMigrations();
    if (!migrationSuccess) {
      console.error('[Migration] ❌ Setup failed at migration step');
      process.exit(1);
    }
    
    // Seed database
    const seedSuccess = await seedDatabase();
    if (!seedSuccess) {
      console.error('[Migration] ⚠️  Seeding failed, but continuing...');
    }
    
    // Create admin account
    const adminSuccess = await createAdminAccount();
    if (!adminSuccess) {
      console.error('[Migration] ⚠️  Admin creation failed, but continuing...');
    }
    
    console.log('='.repeat(60));
    console.log('✅ Database initialization completed!');
    console.log('='.repeat(60));
  } else {
    console.log('[Migration] ✅ Database already initialized. Skipping setup.');
    
    // Still run migrations in case there are new changes
    console.log('[Migration] Checking for pending migrations...');
    await runMigrations();
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('[Migration] Fatal error:', error);
  process.exit(1);
});
