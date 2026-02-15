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
import { existsSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[Migration] DATABASE_URL environment variable is required');
  process.exit(1);
}

/**
 * Parse DATABASE_URL and extract connection config
 * Handles ssl-mode parameter for Railway/Aiven MySQL
 */
function parseDatabaseURL() {
  try {
    const dbUrl = new URL(DATABASE_URL);
    const sslMode = dbUrl.searchParams.get('ssl-mode');
    
    const config = {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace('/', ''),
    };
    
    // For Railway/Aiven MySQL with ssl-mode=REQUIRED, accept self-signed certificates
    if (sslMode === 'REQUIRED' || sslMode === 'required') {
      config.ssl = { rejectUnauthorized: false };
    }
    
    return config;
  } catch (error) {
    console.error('[Migration] Failed to parse DATABASE_URL:', error.message);
    throw error;
  }
}

async function checkDatabaseInitialized() {
  try {
    const connectionConfig = parseDatabaseURL();
    const connection = await mysql.createConnection(connectionConfig);
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
  let connection;
  try {
    const connectionConfig = parseDatabaseURL();
    connection = await mysql.createConnection(connectionConfig);
    const db = drizzle(connection);
    
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function seedDatabase() {
  console.log('[Migration] Seeding database with initial data...');
  let connection;
  try {
    const connectionConfig = parseDatabaseURL();
    connection = await mysql.createConnection(connectionConfig);
    
    // Seed restaurant settings
    console.log('[Migration] Seeding restaurant settings...');
    const defaultSettings = [
      {
        settingKey: 'restaurant_name',
        settingValue: 'Boomiis',
        settingType: 'text',
        description: 'Restaurant name displayed across the site',
      },
      {
        settingKey: 'restaurant_tagline',
        settingValue: 'Authentic African cuisine bringing the flavors of West Africa to the UK. Experience the rich tastes and warm hospitality.',
        settingType: 'textarea',
        description: 'Restaurant tagline/description',
      },
      {
        settingKey: 'contact_address',
        settingValue: '123 High Street, London, UK, SW1A 1AA',
        settingType: 'textarea',
        description: 'Physical address',
      },
      {
        settingKey: 'contact_phone',
        settingValue: '+44 20 1234 5678',
        settingType: 'text',
        description: 'Contact phone number',
      },
      {
        settingKey: 'contact_email',
        settingValue: 'hello@boomiis.uk',
        settingType: 'text',
        description: 'Contact email address',
      },
      {
        settingKey: 'opening_hours',
        settingValue: JSON.stringify({
          monday: { open: '12:00', close: '22:00', closed: false },
          tuesday: { open: '12:00', close: '22:00', closed: false },
          wednesday: { open: '12:00', close: '22:00', closed: false },
          thursday: { open: '12:00', close: '22:00', closed: false },
          friday: { open: '12:00', close: '23:00', closed: false },
          saturday: { open: '12:00', close: '23:00', closed: false },
          sunday: { open: '12:00', close: '21:00', closed: false },
        }),
        settingType: 'json',
        description: 'Restaurant opening hours for each day',
      },
      {
        settingKey: 'social_facebook',
        settingValue: 'https://facebook.com/boomiis',
        settingType: 'text',
        description: 'Facebook page URL',
      },
      {
        settingKey: 'social_instagram',
        settingValue: 'https://instagram.com/boomiis',
        settingType: 'text',
        description: 'Instagram profile URL',
      },
      {
        settingKey: 'social_twitter',
        settingValue: 'https://twitter.com/boomiis',
        settingType: 'text',
        description: 'Twitter/X profile URL',
      },
    ];
    
    for (const setting of defaultSettings) {
      await connection.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [setting.settingKey, setting.settingValue, setting.settingType, setting.description]);
    }
    
    console.log('[Migration] ✅ Settings seeded');
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Seeding failed:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createDefaultAdmin() {
  console.log('[Migration] Checking for admin account...');
  let connection;
  try {
    const connectionConfig = parseDatabaseURL();
    connection = await mysql.createConnection(connectionConfig);
    
    // Check if any admin exists (use single quotes for string values in MySQL)
    const [admins] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const adminCount = admins[0]?.count || 0;
    
    if (adminCount === 0) {
      console.log('[Migration] No admin account found. Creating default admin...');
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurant.com';
      const adminName = process.env.ADMIN_NAME || 'Admin';
      const openId = `admin-${Date.now()}`;
      
      // Create admin account (password will be set on first login)
      await connection.query(`
        INSERT INTO users (openId, email, name, role, is_setup_complete, createdAt, updatedAt, lastSignedIn)
        VALUES (?, ?, ?, 'admin', FALSE, NOW(), NOW(), NOW())
      `, [openId, adminEmail, adminName]);
      
      console.log(`[Migration] ✅ Admin account created: ${adminEmail}`);
      console.log('[Migration] ⚠️  IMPORTANT: Admin must set password on first login');
      console.log(`[Migration] ⚠️  Visit /admin/setup to complete admin setup`);
    } else {
      console.log(`[Migration] ✅ Admin account exists (${adminCount} admin(s) found)`);
    }
    
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Admin account check/creation failed:', error.message);
    console.error(error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
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
    
    // Admin account creation removed - using self-registration flow instead
    // See /admin/register for admin registration
    // const adminSuccess = await createDefaultAdmin();
    // if (!adminSuccess) {
    //   console.error('[Migration] ⚠️  Admin creation failed, but continuing...');
    // }
    
    console.log('='.repeat(60));
    console.log('✅ Database initialization completed!');
    console.log('='.repeat(60));
  } else {
    console.log('[Migration] ✅ Database already initialized.');
    
    // Still apply any pending migrations
    console.log('[Migration] Checking for pending migrations...');
    const migrationSuccess = await runMigrations();
    if (!migrationSuccess) {
      console.error('[Migration] ❌ Pending migrations failed');
      process.exit(1);
    }
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('[Migration] Fatal error:', error);
  process.exit(1);
});
