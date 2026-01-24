import { getDb } from '../server/db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkAdmin() {
  const db = await getDb();
  if (!db) {
    console.log('Database not available');
    return;
  }

  const result = await db.select().from(users).where(eq(users.email, 'admin@boomiis.uk'));
  
  if (result.length === 0) {
    console.log('Admin user not found. Creating...');
    
    // Insert admin user
    await db.insert(users).values({
      openId: 'admin-default',
      email: 'admin@boomiis.uk',
      name: 'Admin',
      role: 'admin',
      loginMethod: 'password',
    });
    
    console.log('Admin user created successfully');
  } else {
    console.log('Admin user found:', JSON.stringify(result[0], null, 2));
  }
}

checkAdmin().catch(console.error);
