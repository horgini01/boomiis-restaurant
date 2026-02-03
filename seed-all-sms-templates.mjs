import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const smsTemplates = [
  {
    templateType: 'order_confirmed',
    templateName: 'Order Confirmed',
    message: 'Hi {{customerName}}! Your order #{{orderNumber}} has been confirmed. We\'ll notify you when it\'s ready!',
    isActive: true,
  },
  {
    templateType: 'order_preparing',
    templateName: 'Order Being Prepared',
    message: 'Good news! Your order #{{orderNumber}} is now being prepared by our chefs at Boomiis Restaurant.',
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
    message: 'Hi {{customerName}}, your order #{{orderNumber}} is taking a bit longer than expected. New estimated time: {{estimatedMinutes}} minutes. Sorry for the wait!',
    isActive: true,
  },
  {
    templateType: 'order_cancelled',
    templateName: 'Order Cancelled',
    message: 'Your order #{{orderNumber}} has been cancelled. If you have questions, please contact Boomiis Restaurant.',
    isActive: true,
  },
];

console.log('Seeding SMS templates...');

for (const template of smsTemplates) {
  try {
    // Check if template already exists
    const existing = await db
      .select()
      .from(schema.smsTemplates)
      .where(eq(schema.smsTemplates.templateType, template.templateType))
      .limit(1);

    if (existing.length > 0) {
      console.log(`✓ Template "${template.templateType}" already exists, skipping...`);
    } else {
      await db.insert(schema.smsTemplates).values(template);
      console.log(`✓ Created template: ${template.templateType}`);
    }
  } catch (error) {
    console.error(`✗ Error creating template ${template.templateType}:`, error.message);
  }
}

console.log('SMS templates seeding complete!');
await connection.end();
