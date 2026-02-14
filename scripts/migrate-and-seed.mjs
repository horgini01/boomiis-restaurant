#!/usr/bin/env node
/**
 * Automatic Database Migration and Seeding Script
 * Runs on application startup to ensure database is properly initialized
 * 
 * NOTE: Migration files should be generated at BUILD time using `pnpm drizzle-kit generate`
 * This script only APPLIES migrations at runtime using the pre-generated files
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[Migration] DATABASE_URL environment variable is required');
  process.exit(1);
}

function parseDatabaseURL() {
  try {
    const dbUrl = new URL(DATABASE_URL);
    const sslMode = dbUrl.searchParams.get('ssl-mode');
    dbUrl.searchParams.delete('ssl-mode');
    
    if (sslMode === 'REQUIRED' || sslMode === 'required') {
      dbUrl.searchParams.set('ssl', JSON.stringify({ rejectUnauthorized: true }));
    }
    
    return dbUrl.toString();
  } catch (error) {
    console.error('[Migration] Failed to parse DATABASE_URL:', error.message);
    return DATABASE_URL;
  }
}

async function checkDatabaseInitialized() {
  try {
    const connectionString = parseDatabaseURL();
    const connection = await mysql.createConnection(connectionString);
    const [tables] = await connection.query('SHOW TABLES');
    await connection.end();
    return tables && tables.length > 0;
  } catch (error) {
    console.log('[Migration] Database check failed:', error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('[Migration] Applying database migrations...');
  try {
    const connectionString = parseDatabaseURL();
    const db = drizzle(connectionString);
    
    // Check if migration files exist
    if (!existsSync('./drizzle')) {
      console.error('[Migration] ❌ Migration directory not found. Run `pnpm drizzle-kit generate` during build.');
      return false;
    }
    
    // Apply migrations using drizzle-orm migrator
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('[Migration] ✅ Migrations applied successfully');
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    console.error(error);
    return false;
  }
}

async function seedDatabase() {
  console.log('[Migration] Seeding database with initial data...');
  try {
    // Seed settings
    if (existsSync('./scripts/seed-settings.mjs')) {
      await execAsync('node scripts/seed-settings.mjs');
      console.log('[Migration] ✅ Settings seeded');
    }
    
    // Seed cookie policy
    if (existsSync('./seed-cookie-policy.mjs')) {
      await execAsync('node seed-cookie-policy.mjs');
      console.log('[Migration] ✅ Cookie policy seeded');
    }
    
    // Seed menu (optional)
    if (existsSync('./scripts/seed-menu.mjs')) {
      try {
        await execAsync('node scripts/seed-menu.mjs');
        console.log('[Migration] ✅ Menu seeded');
      } catch (error) {
        console.log('[Migration] ⚠️  Menu seeding skipped (optional)');
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Seeding failed:', error.message);
    return false;
  }
}

async function createDefaultAdmin() {
  console.log('[Migration] Checking for admin account...');
  try {
    const connectionString = parseDatabaseURL();
    const connection = await mysql.createConnection(connectionString);
    
    // Check if any admin exists
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    const adminCount = admins[0]?.count || 0;
    
    if (adminCount === 0) {
      console.log('[Migration] No admin account found. Creating default admin...');
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurant.com';
      const adminName = process.env.ADMIN_NAME || 'Admin';
      const openId = `admin-${Date.now()}`;
      
      // Create admin account (password will be set on first login)
      await connection.query(`
        INSERT INTO users (open_id, email, name, role, is_setup_complete, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', FALSE, NOW(), NOW())
      `, [openId, adminEmail, adminName]);
      
      console.log(`[Migration] ✅ Admin account created: ${adminEmail}`);
      console.log('[Migration] ⚠️  IMPORTANT: Admin must set password on first login');
      console.log(`[Migration] ⚠️  Visit /admin/setup to complete admin setup`);
    } else {
      console.log(`[Migration] ✅ Admin account exists (${adminCount} admin(s) found)`);
    }
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Admin account check/creation failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 RestaurantPro Database Initialization');
  console.log('='.repeat(60));
  
  const dbInitialized = await checkDatabaseInitialized();
  
  if (!dbInitialized) {
    console.log('[Migration] 📦 Fresh database detected. Running full setup...');
    
    // Apply migrations (files should be pre-generated at build time)
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
    const adminSuccess = await createDefaultAdmin();
    if (!adminSuccess) {
      console.error('[Migration] ⚠️  Admin creation failed, but continuing...');
    }
    
    console.log('='.repeat(60));
    console.log('✅ Database initialization completed!');
    console.log('='.repeat(60));
  } else {
    console.log('[Migration] ✅ Database already initialized.');
    
    // Still apply any pending migrations
    console.log('[Migration] Checking for pending migrations...');
    await runMigrations();
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('[Migration] Fatal error:', error);
  process.exit(1);
});
