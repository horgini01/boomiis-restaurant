import { Request, Response } from 'express';
import { stripe } from '../stripe';
import { getDb } from '../db';
import { orders } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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
        const session = event.data.object;
        const orderId = parseInt(session.metadata?.orderId || '0');

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
