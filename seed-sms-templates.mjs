import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const defaultTemplates = [
  {
    templateType: 'order_ready',
    templateName: 'Order Ready for Pickup',
    message: 'Hi {{customerName}}! Your order #{{orderNumber}} is ready for pickup at Boomiis Restaurant. See you soon!',
    isActive: true,
  },
  {
    templateType: 'out_for_delivery',
    templateName: 'Order Out for Delivery',
    message: 'Hi {{customerName}}! Your order #{{orderNumber}} is out for delivery and will arrive in approximately {{estimatedMinutes}} minutes.',
    isActive: true,
  },
];

console.log('Seeding default SMS templates...');

for (const template of defaultTemplates) {
  try {
    // Check if template already exists
    const existing = await db
      .select()
      .from(schema.smsTemplates)
      .where(eq(schema.smsTemplates.templateType, template.templateType))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.smsTemplates).values(template);
      console.log(`✓ Created template: ${template.templateName}`);
    } else {
      console.log(`- Template already exists: ${template.templateName}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create template ${template.templateName}:`, error.message);
  }
}

console.log('SMS templates seeding complete!');
await connection.end();
process.exit(0);
