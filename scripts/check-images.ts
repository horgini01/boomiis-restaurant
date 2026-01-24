import { drizzle } from 'drizzle-orm/mysql2';
import { menuItems } from '../drizzle/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const db = drizzle(process.env.DATABASE_URL!);

async function checkImages() {
  const items = await db.select().from(menuItems).limit(10);
  console.log('Menu items with images:');
  items.forEach(item => {
    console.log(`${item.name}: ${item.imageUrl || 'NO IMAGE'}`);
  });
}

checkImages().catch(console.error);
