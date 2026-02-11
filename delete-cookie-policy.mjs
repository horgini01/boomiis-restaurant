import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { legalPages } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Delete existing cookie policy
await db.delete(legalPages).where(eq(legalPages.pageType, 'cookie-policy'));
console.log('Cookie policy deleted successfully');

await conn.end();
