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
    
    // Seed SMS templates
    await seedSmsTemplates(connection);
    
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

async function seedSmsTemplates(connection) {
  console.log('[Migration] Seeding SMS templates...');
  try {
    // Check if SMS templates already exist
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM sms_templates');
    const templateCount = existing[0]?.count || 0;
    
    if (templateCount > 0) {
      console.log(`[Migration] SMS templates already exist (${templateCount} templates), skipping seed`);
      return;
    }
    
    // Default SMS templates
    const defaultTemplates = [
      {
        templateType: 'order_confirmed',
        templateName: 'Order Confirmed',
        message: 'Hi {{customerName}}! Your order #{{orderNumber}} has been confirmed. We\'ll notify you when it\'s ready!',
        isActive: true,
      },
      {
        templateType: 'order_preparing',
        templateName: 'Order Preparing',
        message: 'Good news {{customerName}}! Your order #{{orderNumber}} is now being prepared by our kitchen team.',
        isActive: true,
      },
      {
        templateType: 'order_ready',
        templateName: 'Order Ready for Pickup',
        message: 'Hi {{customerName}}! Your order #{{orderNumber}} is ready for pickup at Boomiis Restaurant. See you soon!',
        isActive: true,
      },
      {
        templateType: 'out_for_delivery',
        templateName: 'Out for Delivery',
        message: 'Hi {{customerName}}! Your order #{{orderNumber}} is out for delivery and will arrive in approximately {{estimatedMinutes}} minutes.',
        isActive: true,
      },
      {
        templateType: 'order_delivered',
        templateName: 'Order Delivered',
        message: 'Your order #{{orderNumber}} has been delivered. Enjoy your meal from Boomiis Restaurant! Please rate your experience.',
        isActive: true,
      },
      {
        templateType: 'order_delayed',
        templateName: 'Order Delayed',
        message: 'Hi {{customerName}}, we apologize but your order #{{orderNumber}} is running {{estimatedMinutes}} minutes late. Thank you for your patience!',
        isActive: true,
      },
      {
        templateType: 'order_cancelled',
        templateName: 'Order Cancelled',
        message: 'Your order #{{orderNumber}} has been cancelled. If you have questions, please contact Boomiis Restaurant.',
        isActive: true,
      },
      {
        templateType: 'admin_new_order',
        templateName: 'Admin: New Order',
        message: 'New {{orderType}} order #{{orderNumber}} received! Total: £{{total}}. Check admin panel for details.',
        isActive: true,
      },
      {
        templateType: 'admin_new_reservation',
        templateName: 'Admin: New Reservation',
        message: 'New reservation: {{customerName}}, {{partySize}} guests on {{date}} at {{time}}. Check admin panel.',
        isActive: true,
      },
      {
        templateType: 'admin_catering_quote',
        templateName: 'Admin: Catering Quote Request',
        message: 'Boomiis Catering Quote Request! {{customerName}} wants {{eventType}} for {{guestCount}} guests on {{eventDate}}. Check admin panel.',
        isActive: true,
      },
      {
        templateType: 'reservation_confirmed',
        templateName: 'Reservation Confirmed',
        message: 'Hi {{customerName}}! Your table for {{partySize}} on {{date}} at {{time}} is confirmed at Boomiis Restaurant. See you then!',
        isActive: true,
      },
      {
        templateType: 'reservation_reminder',
        templateName: 'Reservation Reminder',
        message: 'Reminder: Your reservation at Boomiis Restaurant is tomorrow at {{time}} for {{partySize}} guests. Looking forward to seeing you!',
        isActive: true,
      },
      {
        templateType: 'reservation_cancelled',
        templateName: 'Reservation Cancelled',
        message: 'Your reservation at Boomiis Restaurant for {{date}} at {{time}} has been cancelled. Hope to see you again soon!',
        isActive: true,
      },
      {
        templateType: 'catering_confirmed',
        templateName: 'Catering Confirmed',
        message: 'Hi {{customerName}}! Your {{eventType}} is confirmed for {{eventDate}} ({{guestCount}} guests). Check your email for full details!',
        isActive: true,
      },
      {
        templateType: 'catering_quote_response',
        templateName: 'Catering Quote Response',
        message: 'Hi {{customerName}}! Regarding your {{eventType}} inquiry at Boomiis: {{responseMessage}}. Check your email for full details.',
        isActive: true,
      },
    ];
    
    // Insert all templates
    for (const template of defaultTemplates) {
      await connection.query(`
        INSERT INTO sms_templates (template_type, template_name, message, is_active)
        VALUES (?, ?, ?, ?)
      `, [template.templateType, template.templateName, template.message, template.isActive]);
    }
    
    console.log(`[Migration] ✅ SMS templates seeded (${defaultTemplates.length} templates)`);
  } catch (error) {
    console.error('[Migration] ❌ SMS templates seeding failed:', error.message);
    // Don't throw - allow app to start even if SMS seeding fails
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
    
    // Check and seed SMS templates if missing (even on existing databases)
    console.log('[Migration] Checking SMS templates...');
    let connection;
    try {
      const connectionConfig = parseDatabaseURL();
      connection = await mysql.createConnection(connectionConfig);
      await seedSmsTemplates(connection);
    } catch (error) {
      console.error('[Migration] ⚠️  SMS template check failed:', error.message);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('[Migration] Fatal error:', error);
  process.exit(1);
});
