import { Request, Response } from 'express';
import { getDb } from '../db';
import { emailLogs } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Resend webhook handler for email delivery events
 * 
 * Supported events:
 * - email.sent: Email was accepted by Resend
 * - email.delivered: Email was successfully delivered to recipient's mail server
 * - email.opened: Recipient opened the email
 * - email.clicked: Recipient clicked a link in the email
 * - email.bounced: Email bounced (hard or soft)
 * - email.complained: Recipient marked email as spam
 * 
 * Webhook signature verification is handled by Resend's SDK
 */
export async function handleResendWebhook(req: Request, res: Response) {
  try {
    const event = req.body;
    
    console.log(`[Resend Webhook] Received event: ${event.type}`);
    
    // Extract email ID from event
    const emailId = event.data?.email_id;
    if (!emailId) {
      console.warn('[Resend Webhook] No email_id in event data');
      return res.status(200).json({ received: true });
    }

    const db = await getDb();
    if (!db) {
      console.error('[Resend Webhook] Database not available');
      return res.status(500).json({ error: 'Database not available' });
    }

    // Find email log by resendId
    const logs = await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.resendId, emailId))
      .limit(1);

    if (logs.length === 0) {
      console.warn(`[Resend Webhook] No email log found for resendId: ${emailId}`);
      return res.status(200).json({ received: true });
    }

    const log = logs[0];

    // Update email log based on event type
    switch (event.type) {
      case 'email.sent':
        await db.update(emailLogs)
          .set({
            status: 'sent',
            sentAt: new Date(event.created_at),
          })
          .where(eq(emailLogs.id, log.id));
        console.log(`[Resend Webhook] Email ${emailId} marked as sent`);
        break;

      case 'email.delivered':
        await db.update(emailLogs)
          .set({
            status: 'delivered',
            deliveredAt: new Date(event.created_at),
          })
          .where(eq(emailLogs.id, log.id));
        console.log(`[Resend Webhook] Email ${emailId} marked as delivered`);
        break;

      case 'email.delivery_delayed':
        // Don't change status, just log the delay
        console.log(`[Resend Webhook] Email ${emailId} delivery delayed`);
        break;

      case 'email.opened':
        // Only update if not already opened (track first open)
        if (!log.openedAt) {
          await db.update(emailLogs)
            .set({
              status: 'opened',
              openedAt: new Date(event.created_at),
            })
            .where(eq(emailLogs.id, log.id));
          console.log(`[Resend Webhook] Email ${emailId} marked as opened`);
        }
        break;

      case 'email.clicked':
        // Track click (can happen multiple times)
        await db.update(emailLogs)
          .set({
            status: 'clicked',
            clickedAt: new Date(event.created_at),
          })
          .where(eq(emailLogs.id, log.id));
        console.log(`[Resend Webhook] Email ${emailId} marked as clicked`);
        break;

      case 'email.bounced':
        const bounceType = event.data?.bounce_type || 'unknown';
        const errorMsg = event.data?.error_message || `Email bounced (${bounceType})`;
        
        await db.update(emailLogs)
          .set({
            status: 'bounced',
            bouncedAt: new Date(event.created_at),
            errorMessage: errorMsg,
          })
          .where(eq(emailLogs.id, log.id));
        console.log(`[Resend Webhook] Email ${emailId} bounced: ${errorMsg}`);
        break;

      case 'email.complained':
        await db.update(emailLogs)
          .set({
            status: 'bounced', // Use 'bounced' status for complaints
            bouncedAt: new Date(event.created_at),
            errorMessage: 'Recipient marked email as spam',
          })
          .where(eq(emailLogs.id, log.id));
        console.log(`[Resend Webhook] Email ${emailId} marked as spam by recipient`);
        break;

      default:
        console.log(`[Resend Webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[Resend Webhook] Error processing webhook:', error.message);
    res.status(500).json({ error: 'Webhook processing error' });
  }
}
