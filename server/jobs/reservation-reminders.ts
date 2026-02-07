import { getDb } from '../db';
import { reservations } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';
import { sendReservationReminderEmail } from '../email';
import { sendReservationStatusSMS } from '../services/sms.service';
import { formatPhoneNumberE164 } from '../services/sms.service';

/**
 * Send reservation reminders for reservations happening in 24 hours
 * This job should be run periodically (e.g., every hour)
 */
export async function sendReservationReminders(): Promise<void> {
  console.log('[Reservation Reminders] Starting job...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Reservation Reminders] Database not available');
      return;
    }

    // Calculate the time window: 23-25 hours from now
    // This gives us a 2-hour window to catch reservations
    const now = new Date();
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find confirmed reservations in the next 24 hours (with 1-hour buffer on each side)
    const upcomingReservations = await db
      .select()
      .from(reservations)
      .where(
        sql`${reservations.status} = 'confirmed' 
            AND ${reservations.reservationDate} >= ${twentyThreeHoursFromNow} 
            AND ${reservations.reservationDate} <= ${twentyFiveHoursFromNow}`
      );

    console.log(`[Reservation Reminders] Found ${upcomingReservations.length} reservations to remind`);

    for (const reservation of upcomingReservations) {
      try {
        // Send email reminder
        await sendReservationReminderEmail({
          customerName: reservation.customerName,
          customerEmail: reservation.customerEmail,
          reservationDate: reservation.reservationDate,
          reservationTime: reservation.reservationTime,
          partySize: reservation.partySize,
          specialRequests: reservation.specialRequests || undefined,
        });

        // Send SMS reminder if phone number is provided
        if (reservation.customerPhone) {
          const formattedPhone = formatPhoneNumberE164(reservation.customerPhone);
          await sendReservationStatusSMS(
            reservation.customerName,
            formattedPhone,
            reservation.reservationDate,
            reservation.reservationTime,
            'reminder'
          );
        }

        console.log(`[Reservation Reminders] Sent reminder for reservation #${reservation.id}`);
      } catch (error) {
        console.error(`[Reservation Reminders] Failed to send reminder for reservation #${reservation.id}:`, error);
        // Continue with other reservations even if one fails
      }
    }

    console.log('[Reservation Reminders] Job completed successfully');
  } catch (error) {
    console.error('[Reservation Reminders] Job failed:', error);
  }
}

// Export a function that can be called from a cron job or scheduler
export default sendReservationReminders;
