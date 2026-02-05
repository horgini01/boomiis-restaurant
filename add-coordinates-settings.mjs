import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { siteSettings } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('Adding latitude and longitude settings...');

// Add or update latitude setting
const latitudeExists = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'restaurant_latitude'));
if (latitudeExists.length === 0) {
  await db.insert(siteSettings).values({
    settingKey: 'restaurant_latitude',
    settingValue: '50.470180',
    settingType: 'number',
    description: 'Restaurant latitude coordinate for Google Maps'
  });
  console.log('✓ Added restaurant_latitude setting');
} else {
  console.log('✓ restaurant_latitude setting already exists');
}

// Add or update longitude setting
const longitudeExists = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'restaurant_longitude'));
if (longitudeExists.length === 0) {
  await db.insert(siteSettings).values({
    settingKey: 'restaurant_longitude',
    settingValue: '-3.537695',
    settingType: 'number',
    description: 'Restaurant longitude coordinate for Google Maps'
  });
  console.log('✓ Added restaurant_longitude setting');
} else {
  console.log('✓ restaurant_longitude setting already exists');
}

console.log('\nCoordinate settings added successfully!');
await connection.end();
