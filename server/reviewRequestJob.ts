import { getDb } from './db';
import { orders, orderItems, menuItems, siteSettings } from '../drizzle/schema';
import { sendReviewRequestEmail } from './reviewRequestEmail';
import { eq, and, isNull, sql } from 'drizzle-orm';

/**
 * Check if review requests are enabled in settings
 */
async function isReviewRequestEnabled(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const setting = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, 'review_requests_enabled'))
      .limit(1);

    if (setting.length === 0) {
      // Default to enabled if setting doesn't exist
      return true;
    }

    return setting[0].settingValue === 'true';
  } catch (error) {
    console.error('[ReviewRequestJob] Error checking if review requests enabled:', error);
    return false;
  }
}

/**
 * Find orders that are completed 24 hours ago and haven't received review request yet
 */
async function findOrdersForReviewRequest() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[ReviewRequestJob] Database not available');
      return [];
    }

    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    // Find completed orders from 24-25 hours ago that haven't received review request
    const eligibleOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          eq(orders.reviewRequestSent, false),
          sql`${orders.updatedAt} >= ${twentyFiveHoursAgo}`,
          sql`${orders.updatedAt} <= ${twentyFourHoursAgo}`
        )
      );

    return eligibleOrders;
  } catch (error) {
    console.error('[ReviewRequestJob] Error finding orders for review request:', error);
    return [];
  }
}

/**
 * Get order items for a specific order
 */
async function getOrderItems(orderId: number) {
  try {
    const db = await getDb();
    if (!db) return [];

    const items = await db
      .select({
        name: menuItems.name,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, orderId));

    return items;
  } catch (error) {
    console.error('[ReviewRequestJob] Error fetching order items:', error);
    return [];
  }
}

/**
 * Mark order as review request sent
 */
async function markReviewRequestSent(orderId: number) {
  try {
    const db = await getDb();
    if (!db) return false;

    await db
      .update(orders)
      .set({
        reviewRequestSent: true,
        reviewRequestSentAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return true;
  } catch (error) {
    console.error('[ReviewRequestJob] Error marking review request as sent:', error);
    return false;
  }
}

/**
 * Process review requests for eligible orders
 */
export async function processReviewRequests() {
  console.log('[ReviewRequestJob] Starting review request processing...');

  try {
    // Check if review requests are enabled
    const enabled = await isReviewRequestEnabled();
    if (!enabled) {
      console.log('[ReviewRequestJob] Review requests are disabled in settings');
      return { processed: 0, sent: 0, failed: 0, disabled: true };
    }

    // Find eligible orders
    const eligibleOrders = await findOrdersForReviewRequest();
    console.log(`[ReviewRequestJob] Found ${eligibleOrders.length} eligible orders`);

    if (eligibleOrders.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Process each order
    for (const order of eligibleOrders) {
      try {
        // Get order items
        const items = await getOrderItems(order.id);

        if (items.length === 0) {
          console.warn(`[ReviewRequestJob] No items found for order ${order.orderNumber}`);
          continue;
        }

        // Send review request email
        const result = await sendReviewRequestEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          orderDate: order.createdAt,
          items,
        });

        if (result.success) {
          // Mark as sent
          await markReviewRequestSent(order.id);
          sent++;
          console.log(`[ReviewRequestJob] Review request sent for order ${order.orderNumber}`);
        } else {
          failed++;
          console.error(`[ReviewRequestJob] Failed to send review request for order ${order.orderNumber}:`, result.error);
        }
      } catch (error) {
        failed++;
        console.error(`[ReviewRequestJob] Error processing order ${order.orderNumber}:`, error);
      }
    }

    console.log(`[ReviewRequestJob] Completed: ${sent} sent, ${failed} failed out of ${eligibleOrders.length} orders`);
    return { processed: eligibleOrders.length, sent, failed };
  } catch (error) {
    console.error('[ReviewRequestJob] Error in review request processing:', error);
    return { processed: 0, sent: 0, failed: 0, error };
  }
}
