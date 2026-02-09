import { Request, Response } from 'express';
import { stripe } from '../stripe';
import { getDb } from '../db';
import { orders, orderItems, menuItems, siteSettings } from '../../drizzle/schema';
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
        const paymentIntentId = session.payment_intent as string;
        
        console.log(`[Webhook] Payment intent ID: ${paymentIntentId}, payment status: ${session.payment_status}`);

        if (session.payment_status === 'paid' && paymentIntentId) {
          const db = await getDb();
          if (!db) {
            console.error('[Webhook] Database not available');
            return res.status(500).send('Database not available');
          }

          // IDEMPOTENCY CHECK: Check if order already exists for this payment intent
          const existingOrder = await db.select().from(orders).where(eq(orders.paymentIntentId, paymentIntentId)).limit(1);
          
          if (existingOrder.length > 0) {
            console.log(`[Webhook] Order already exists for payment intent ${paymentIntentId}, skipping duplicate creation`);
            return res.json({ received: true, message: 'Order already processed' });
          }

          // Extract order data from session metadata
          const metadata = session.metadata;
          if (!metadata || !metadata.customerName || !metadata.items) {
            console.error('[Webhook] Missing required metadata in session');
            return res.status(400).send('Missing order data in session metadata');
          }

          // Parse items from JSON string
          let orderItemsData;
          try {
            orderItemsData = JSON.parse(metadata.items);
          } catch (err) {
            console.error('[Webhook] Failed to parse items from metadata:', err);
            return res.status(400).send('Invalid items data in metadata');
          }

          // Generate order number
          const orderNumber = `BO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          // Convert preferred time to timestamp if provided
          let scheduledFor = null;
          if (metadata.preferredTime) {
            try {
              const [hours, minutes] = metadata.preferredTime.split(':').map(Number);
              const now = new Date();
              const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
              const ukYear = ukTime.getFullYear();
              const ukMonth = ukTime.getMonth();
              const ukDate = ukTime.getDate();
              scheduledFor = new Date(ukYear, ukMonth, ukDate, hours, minutes, 0, 0);
            } catch (err) {
              console.error('[Webhook] Failed to parse preferredTime:', err);
            }
          }

          // Create order in database
          const [result] = await db.insert(orders).values({
            orderNumber,
            customerName: metadata.customerName,
            customerEmail: metadata.customerEmail,
            customerPhone: metadata.customerPhone,
            orderType: metadata.orderType as 'delivery' | 'pickup',
            deliveryAddress: metadata.deliveryAddress || null,
            deliveryPostcode: metadata.deliveryPostcode || null,
            scheduledFor,
            subtotal: metadata.subtotal,
            deliveryFee: metadata.deliveryFee,
            total: metadata.total,
            status: 'confirmed', // Order is confirmed immediately after payment
            paymentStatus: 'paid',
            paymentIntentId,
            specialInstructions: metadata.specialInstructions || null,
            smsOptIn: metadata.smsOptIn === 'true',
          });

          const orderId = result.insertId;
          console.log(`[Webhook] Created order ${orderNumber} (ID: ${orderId})`);

          // Insert order items
          for (const item of orderItemsData) {
            await db.insert(orderItems).values({
              orderId,
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              quantity: item.quantity,
              price: item.price.toString(),
              subtotal: (item.price * item.quantity).toString(),
            });
          }

          console.log(`[Webhook] Inserted ${orderItemsData.length} order items`);

          // Prepare email data
          const emailData = {
            orderNumber,
            customerName: metadata.customerName,
            customerEmail: metadata.customerEmail,
            customerPhone: metadata.customerPhone,
            orderType: metadata.orderType as 'delivery' | 'pickup',
            scheduledFor: scheduledFor || undefined,
            items: orderItemsData.map((item: any) => ({
              name: item.menuItemName,
              quantity: item.quantity,
              price: parseFloat(item.price),
            })),
            subtotal: parseFloat(metadata.subtotal),
            deliveryFee: parseFloat(metadata.deliveryFee),
            total: parseFloat(metadata.total),
            deliveryAddress: metadata.deliveryAddress || undefined,
            deliveryPostcode: metadata.deliveryPostcode || undefined,
            specialInstructions: metadata.specialInstructions || undefined,
            paymentIntentId,
          };

          // Send customer confirmation email
          try {
            await sendOrderConfirmationEmail(emailData);
            console.log(`[Webhook] Sent customer confirmation email to ${metadata.customerEmail}`);
          } catch (emailError: any) {
            console.error('[Webhook] Failed to send customer email:', emailError.message);
          }

          // Send admin notification email
          try {
            await sendAdminOrderNotification(emailData);
            console.log(`[Webhook] Sent admin notification email`);
          } catch (emailError: any) {
            console.error('[Webhook] Failed to send admin email:', emailError.message);
          }

          // Send admin SMS notification
          try {
            const { sendAdminNewOrderSMS } = await import('../services/sms.service');
            // Fetch admin phone from site settings
            const [phoneSetting] = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'contact_phone')).limit(1);
            const adminPhone = phoneSetting?.settingValue;
            
            if (adminPhone) {
              await sendAdminNewOrderSMS(
                adminPhone,
                orderNumber,
                parseFloat(metadata.total),
                metadata.orderType as 'delivery' | 'pickup'
              );
              console.log(`[Webhook] Sent admin SMS notification to ${adminPhone}`);
            } else {
              console.log('[Webhook] No admin phone configured in settings, skipping SMS');
            }
          } catch (smsError: any) {
            console.error('[Webhook] Failed to send admin SMS:', smsError.message);
          }

          // Send customer SMS notification
          try {
            if (metadata.smsOptIn === 'true' && metadata.customerPhone) {
              const { sendOrderStatusSMS } = await import('../services/sms.service');
              await sendOrderStatusSMS(
                metadata.customerName,
                metadata.customerPhone,
                orderNumber,
                'order_confirmed',
                30, // estimated minutes
                true
              );
              console.log(`[Webhook] Sent customer SMS notification to ${metadata.customerPhone}`);
            }
          } catch (smsError: any) {
            console.error('[Webhook] Failed to send customer SMS:', smsError.message);
          }

          console.log(`[Webhook] Successfully processed order ${orderNumber}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(`[Webhook] Payment failed for payment intent ${paymentIntent.id}`);
        // No order to update since we don't create orders until payment succeeds
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
