import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { legalPages } from './drizzle/schema.js';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const pages = await db.select().from(legalPages);
console.log('Legal pages in database:');
console.log(JSON.stringify(pages, null, 2));

await conn.end();
