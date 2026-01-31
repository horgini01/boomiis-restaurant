import { getDb } from '../db';
import { orders, orderItems, siteSettings } from '../../drizzle/schema';
import { sendDailySalesSummaryEmail } from '../email';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Generate and send daily sales summary email
 * This function should be called once per day (e.g., at midnight or end of business day)
 */
export async function sendDailySalesSummary(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Daily Summary] Database not available');
      return;
    }

    // Check if daily emails are enabled
    const [emailSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'daily_sales_email_enabled'))
      .limit(1);

    const isEnabled = emailSetting?.settingValue === 'true';
    if (!isEnabled) {
      console.log('[Daily Summary] Daily sales emails are disabled');
      return;
    }

    // Get yesterday's date range
    const yesterday = subDays(new Date(), 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    // Fetch paid orders from yesterday
    const paidOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, 'paid'),
          gte(orders.createdAt, dayStart),
          lte(orders.createdAt, dayEnd)
        )
      );

    // Calculate metrics
    const totalRevenue = paidOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const totalOrders = paidOrders.length;
    const deliveryOrders = paidOrders.filter(o => o.orderType === 'delivery').length;
    const pickupOrders = paidOrders.filter(o => o.orderType === 'pickup').length;

    // Calculate popular items from order_items table
    const orderIds = paidOrders.map(o => o.id);
    const itemCounts: Record<string, number> = {};
    
    if (orderIds.length > 0) {
      const items = await db
        .select()
        .from(orderItems)
        .where(sql`${orderItems.orderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
      
      items.forEach(item => {
        itemCounts[item.menuItemName] = (itemCounts[item.menuItemName] || 0) + item.quantity;
      });
    }

    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average prep time
    const prepTimes: number[] = [];
    paidOrders.forEach(order => {
      try {
        const timeline: Array<{status: string, timestamp: string}> = order.timeline ? JSON.parse(order.timeline) : [];
        const preparingEntry = timeline.find(t => t.status === 'preparing');
        const readyEntry = timeline.find(t => t.status === 'ready');
        
        if (preparingEntry && readyEntry) {
          const prepStart = new Date(preparingEntry.timestamp).getTime();
          const prepEnd = new Date(readyEntry.timestamp).getTime();
          const prepTimeMinutes = (prepEnd - prepStart) / (1000 * 60);
          if (prepTimeMinutes > 0 && prepTimeMinutes < 300) {
            prepTimes.push(prepTimeMinutes);
          }
        }
      } catch (e) {
        // Skip invalid timeline
      }
    });

    const averagePrepTime = prepTimes.length > 0
      ? prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length
      : 0;

    // Count pending orders (current day)
    const pendingOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'pending'));

    const pendingCount = Number(pendingOrders[0]?.count || 0);

    // Send email
    await sendDailySalesSummaryEmail({
      date: format(yesterday, 'EEEE, MMMM d, yyyy'),
      totalRevenue,
      totalOrders,
      deliveryOrders,
      pickupOrders,
      popularItems,
      averagePrepTime,
      pendingOrders: pendingCount,
    });

    console.log(`[Daily Summary] Successfully sent summary for ${format(yesterday, 'yyyy-MM-dd')}`);
  } catch (error) {
    console.error('[Daily Summary] Failed to generate/send daily summary:', error);
  }
}
