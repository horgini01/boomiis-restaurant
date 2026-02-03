import { Request, Response } from 'express';
import { stripe } from '../stripe';
import { getDb } from '../db';
import { orders, orderItems, menuItems } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '../email';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    console.error('[Webhook] Missing signature or webhook secret');
    return res.status(400).send('Webhook signature or secret missing');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`[Webhook] Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith('evt_test_')) {
    console.log('[Webhook] Test event detected, returning verification response');
    return res.json({ verified: true });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('[Webhook] checkout.session.completed event received');
        const session = event.data.object;
        const orderId = parseInt(session.metadata?.orderId || '0');
        console.log(`[Webhook] Processing order ID: ${orderId}, payment status: ${session.payment_status}`);

        if (orderId && session.payment_status === 'paid') {
          const db = await getDb();
          if (db) {
            await db.update(orders)
              .set({ 
                paymentStatus: 'paid',
                status: 'confirmed',
                paymentIntentId: session.payment_intent as string,
              })
              .where(eq(orders.id, orderId));

            console.log(`[Webhook] Order ${orderId} marked as paid`);

            // Send email notifications
            try {
              // Fetch order details
              const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

              if (order) {
                // Fetch order items with menu item details
                const items = await db
                  .select({
                    quantity: orderItems.quantity,
                    price: orderItems.price,
                    name: menuItems.name,
                  })
                  .from(orderItems)
                  .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
                  .where(eq(orderItems.orderId, orderId));

                const emailData = {
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  customerEmail: order.customerEmail,
                  customerPhone: order.customerPhone,
                  orderType: order.orderType,
                  scheduledFor: order.scheduledFor || undefined,
                  items: items.map((item: any) => ({
                    name: item.name || 'Unknown Item',
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                  })),
                  subtotal: parseFloat(order.subtotal),
                  deliveryFee: parseFloat(order.deliveryFee),
                  total: parseFloat(order.total),
                  deliveryAddress: order.deliveryAddress || undefined,
                  deliveryPostcode: order.deliveryPostcode || undefined,
                  specialInstructions: order.specialInstructions || undefined,
                  paymentIntentId: session.payment_intent as string,
                };

                // Send customer confirmation email
                await sendOrderConfirmationEmail(emailData);

                // Send admin notification email
                await sendAdminOrderNotification(emailData);
              }
            } catch (emailError: any) {
              console.error('[Webhook] Failed to send email notifications:', emailError.message);
              // Don't fail the webhook if email fails
            }

            // Send SMS notification to customer (separate try-catch)
            console.log('[Webhook] About to send SMS notification');
            try {
              const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
              if (order && order.customerPhone) {
                console.log(`[Webhook] Sending SMS to ${order.customerPhone}`);
                const { sendOrderStatusSMS } = await import('../services/sms.service');
                await sendOrderStatusSMS(
                  order.customerName,
                  order.customerPhone,
                  order.orderNumber,
                  'order_confirmed'
                );
              } else {
                console.log('[Webhook] No customer phone number, skipping SMS');
              }
            } catch (smsError: any) {
              console.error('[Webhook] Failed to send SMS notification:', smsError.message);
              // Don't fail the webhook if SMS fails
            }
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = parseInt(paymentIntent.metadata?.orderId || '0');

        if (orderId) {
          const db = await getDb();
          if (db) {
            await db.update(orders)
              .set({ paymentStatus: 'paid', status: 'confirmed' })
              .where(eq(orders.id, orderId));

            console.log(`[Webhook] Payment succeeded for order ${orderId}`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = parseInt(paymentIntent.metadata?.orderId || '0');

        if (orderId) {
          const db = await getDb();
          if (db) {
            await db.update(orders)
              .set({ paymentStatus: 'failed' })
              .where(eq(orders.id, orderId));

            console.log(`[Webhook] Payment failed for order ${orderId}`);
          }
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing event:`, error.message);
    res.status(500).send('Webhook processing error');
  }
}
