import { drizzle } from 'drizzle-orm/mysql2';
import { menuItems } from '../drizzle/schema';

const db = drizzle(process.env.DATABASE_URL!);

async function getMenuItems() {
  const items = await db.select().from(menuItems);
  console.log(JSON.stringify(items, null, 2));
}

getMenuItems();
