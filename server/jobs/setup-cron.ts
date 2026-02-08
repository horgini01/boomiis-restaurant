import cron from 'node-cron';
import sendReservationReminders from './reservation-reminders';
import { processReviewRequests } from '../reviewRequestJob';

/**
 * Setup cron jobs for scheduled tasks
 * This function should be called when the server starts
 */
export function setupCronJobs(): void {
  // Run reservation reminders every hour
  // Cron expression: "0 * * * *" means "at minute 0 of every hour"
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running reservation reminders job...');
    try {
      await sendReservationReminders();
    } catch (error) {
      console.error('[Cron] Reservation reminders job failed:', error);
    }
  });

  // Run review request processing every hour
  // Cron expression: "30 * * * *" means "at minute 30 of every hour"
  cron.schedule('30 * * * *', async () => {
    console.log('[Cron] Running review request processing job...');
    try {
      await processReviewRequests();
    } catch (error) {
      console.error('[Cron] Review request processing job failed:', error);
    }
  });

  console.log('[Cron] Scheduled jobs initialized:');
  console.log('  - Reservation reminders: Every hour at minute 0');
  console.log('  - Review requests: Every hour at minute 30');
}
