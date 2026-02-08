import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { emailTemplates } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Check if weekly_report template exists
const existing = await db.select().from(emailTemplates)
  .where(eq(emailTemplates.templateType, 'weekly_report'));

if (existing.length > 0) {
  console.log('Weekly report template already exists');
  process.exit(0);
}

// Create weekly report template
await db.insert(emailTemplates).values({
  templateType: 'weekly_report',
  subject: 'Weekly Performance Report - {{restaurantName}}',
  bodyHtml: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: {{headerColor}}; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Weekly Performance Report</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">{{weekStart}} - {{weekEnd}}</p>
      </div>
      
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937; margin-top: 0;">Revenue Summary</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Total Revenue:</strong> £{{totalRevenue}}</p>
          <p style="margin: 0 0 10px 0;"><strong>Total Orders:</strong> {{totalOrders}}</p>
          <p style="margin: 0;"><strong>Average Order Value:</strong> £{{avgOrderValue}}</p>
        </div>

        <h2 style="color: #1f2937;">Top Performing Items</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          {{topItems}}
        </div>

        <h2 style="color: #1f2937;">Customer Insights</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>New Customers:</strong> {{newCustomers}}</p>
          <p style="margin: 0 0 10px 0;"><strong>Repeat Customers:</strong> {{repeatCustomers}}</p>
          <p style="margin: 0;"><strong>Reservations:</strong> {{totalReservations}}</p>
        </div>

        <h2 style="color: #1f2937;">Performance Trends</h2>
        <div style="background: white; padding: 20px; border-radius: 8px;">
          <p style="margin: 0 0 10px 0;"><strong>vs Last Week:</strong> {{weekOverWeekChange}}</p>
          <p style="margin: 0;"><strong>Busiest Day:</strong> {{busiestDay}}</p>
        </div>
      </div>

      <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 14px;">{{footerText}}</p>
      </div>
    </div>
  `,
  headerColor: '#d4a574',
  footerText: 'This is an automated weekly report from your restaurant management system.',
  isActive: true,
});

console.log('Weekly report template created successfully');
await connection.end();
