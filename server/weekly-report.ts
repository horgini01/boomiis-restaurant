import { Router } from 'express';
import { getDb } from './db';
import { emailTemplates } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getResendClient, FROM_EMAIL } from './email';

const router = Router();

router.post('/api/send-weekly-report', async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get the weekly report template
    const templates = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.templateType, 'weekly_report'));
    
    const template = templates[0];
    if (!template) {
      return res.status(404).json({ error: 'Weekly report template not found. Please configure it in Email Templates settings.' });
    }

    // Generate report data
    // We duplicate the tRPC procedure logic here since we're in an Express route
    const { orders, orderItems, menuItems, reservations, testimonials } = await import('../drizzle/schema');
    const { and, sql } = await import('drizzle-orm');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get orders
    const ordersData = await db.select().from(orders)
      .where(and(
        sql`DATE(${orders.createdAt}) >= ${startDateStr}`,
        sql`DATE(${orders.createdAt}) <= ${endDateStr}`,
        eq(orders.paymentStatus, 'paid')
      ));

    // Calculate metrics
    const totalRevenue = ordersData.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const totalOrders = ordersData.length;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';

    // Get reservations
    const reservationsData = await db.select().from(reservations)
      .where(and(
        sql`DATE(${reservations.createdAt}) >= ${startDateStr}`,
        sql`DATE(${reservations.createdAt}) <= ${endDateStr}`
      ));

    // Get order items for top item
    const orderItemsData = await db.select().from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(
        sql`DATE(${orders.createdAt}) >= ${startDateStr}`,
        sql`DATE(${orders.createdAt}) <= ${endDateStr}`,
        eq(orders.paymentStatus, 'paid')
      ));

    // Calculate top item
    const itemSales: Record<string, { name: string; quantity: number }> = {};
    orderItemsData.forEach(item => {
      const itemName = item.menu_items.name;
      if (!itemSales[itemName]) {
        itemSales[itemName] = { name: itemName, quantity: 0 };
      }
      itemSales[itemName].quantity += item.order_items.quantity;
    });

    const topItemData = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity)[0];
    const topItem = topItemData ? topItemData.name : 'N/A';
    const topItemSales = topItemData ? topItemData.quantity : 0;

    // Calculate busiest day
    const dayCounts: Record<string, number> = {};
    ordersData.forEach(order => {
      const day = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const busiestDayData = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const busiestDay = busiestDayData ? busiestDayData[0] : 'N/A';
    const busiestDayOrders = busiestDayData ? busiestDayData[1] : 0;

    // Calculate peak hour
    const hourCounts: Record<number, number> = {};
    ordersData.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHourData = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakHour = peakHourData ? `${peakHourData[0]}:00` : 'N/A';

    // Get customer insights
    const customerInsights = await db.select({
      customerEmail: orders.customerEmail,
      orderCount: sql<number>`COUNT(*)`,
    })
      .from(orders)
      .where(and(
        sql`DATE(${orders.createdAt}) >= ${startDateStr}`,
        sql`DATE(${orders.createdAt}) <= ${endDateStr}`,
        eq(orders.paymentStatus, 'paid')
      ))
      .groupBy(orders.customerEmail);

    const newCustomers = customerInsights.filter(c => c.orderCount === 1).length;
    const repeatCustomers = customerInsights.filter(c => c.orderCount > 1).length;
    const repeatRate = customerInsights.length > 0 
      ? `${((repeatCustomers / customerInsights.length) * 100).toFixed(1)}%`
      : '0%';

    // Get alerts
    const pendingTestimonials = await db.select({ count: sql<number>`COUNT(*)` })
      .from(testimonials)
      .where(eq(testimonials.isApproved, false));

    const unconfirmedReservations = await db.select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(eq(reservations.status, 'pending'));

    const allMenuItems = await db.select().from(menuItems);
    const orderedItemIds = new Set(orderItemsData.map(item => item.order_items.menuItemId));
    const neverOrderedCount = allMenuItems.filter(item => !orderedItemIds.has(item.id)).length;

    // Prepare email variables
    const variables = {
      startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      endDate: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders: totalOrders.toString(),
      avgOrderValue,
      totalReservations: reservationsData.length.toString(),
      topItem,
      topItemSales: topItemSales.toString(),
      busiestDay,
      busiestDayOrders: busiestDayOrders.toString(),
      peakHour,
      newCustomers: newCustomers.toString(),
      repeatCustomers: repeatCustomers.toString(),
      repeatRate,
      pendingTestimonials: (pendingTestimonials[0]?.count || 0).toString(),
      unconfirmedReservations: (unconfirmedReservations[0]?.count || 0).toString(),
      neverOrderedCount: neverOrderedCount.toString(),
      dashboardUrl: `${process.env.BASE_URL}/admin/dashboard`,
    };

    // Replace variables in template
    let subject = template.subject;
    let bodyHtml = template.bodyHtml;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
    });

    // Build full HTML email
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: ${template.headerColor}; color: #ffffff; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    h1, h2, h3 { margin-top: 0; }
    .alert { background: #fef3cd; border-left: 4px solid #f0ad4e; padding: 12px; margin: 15px 0; }
    .total { font-size: 18px; font-weight: bold; color: ${template.headerColor}; }
    a { color: ${template.headerColor}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Report</h1>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      ${template.footerText}
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const resend = getResendClient();
    if (!resend) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    const adminEmail = process.env.ADMIN_EMAIL || FROM_EMAIL;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject,
      html: fullHtml,
    });

    res.json({ success: true, message: 'Weekly report sent successfully' });
  } catch (error: any) {
    console.error('Error sending weekly report:', error);
    res.status(500).json({ error: error.message || 'Failed to send weekly report' });
  }
});

export default router;
