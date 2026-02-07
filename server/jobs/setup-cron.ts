import cron from 'node-cron';
import sendReservationReminders from './reservation-reminders';

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

  console.log('[Cron] Scheduled jobs initialized:');
  console.log('  - Reservation reminders: Every hour at minute 0');
}
