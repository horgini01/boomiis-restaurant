import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { openingHours } from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Default opening hours based on the admin UI screenshot
const defaultHours = [
  { dayOfWeek: 0, openTime: '12:00', closeTime: '21:00', isClosed: false }, // Sunday
  { dayOfWeek: 1, openTime: '12:00', closeTime: '22:00', isClosed: false }, // Monday
  { dayOfWeek: 2, openTime: '12:00', closeTime: '22:00', isClosed: false }, // Tuesday
  { dayOfWeek: 3, openTime: '12:00', closeTime: '22:00', isClosed: false }, // Wednesday
  { dayOfWeek: 4, openTime: '12:00', closeTime: '22:00', isClosed: false }, // Thursday
  { dayOfWeek: 5, openTime: '12:00', closeTime: '23:00', isClosed: false }, // Friday
  { dayOfWeek: 6, openTime: '12:00', closeTime: '23:00', isClosed: false }, // Saturday
];

try {
  // Clear existing opening hours
  await db.delete(openingHours);
  
  // Insert default hours
  await db.insert(openingHours).values(defaultHours);
  
  console.log('✅ Default opening hours seeded successfully!');
  console.log('Monday-Thursday: 12:00 PM - 10:00 PM');
  console.log('Friday-Saturday: 12:00 PM - 11:00 PM');
  console.log('Sunday: 12:00 PM - 9:00 PM');
} catch (error) {
  console.error('❌ Error seeding opening hours:', error);
} finally {
  await connection.end();
}
