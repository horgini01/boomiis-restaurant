import { router, protectedProcedure } from './_core/trpc';
import { checkSMSCreditBalance } from './services/sms-credit-checker.service';

// Credit thresholds
const SMS_WARNING_THRESHOLD = 100;
const SMS_CRITICAL_THRESHOLD = 20;

// For email, we track locally since Resend doesn't provide an API
const EMAIL_WARNING_THRESHOLD = 80; // 80 emails remaining in daily quota
const EMAIL_CRITICAL_THRESHOLD = 20; // 20 emails remaining

interface CreditStatus {
  provider: string;
  balance: number;
  status: 'ok' | 'warning' | 'critical';
  threshold?: number;
  message?: string;
}

export const creditMonitoringRouter = router({
  /**
   * Check SMS credit balance and return status with threshold info
   */
  checkSMSCredits: protectedProcedure.query(async () => {
    const result = await checkSMSCreditBalance();

    if (!result.success) {
      return {
        provider: result.provider,
        balance: 0,
        status: 'critical' as const,
        message: result.error || 'Failed to check SMS credits',
      };
    }

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    let message: string | undefined;
    let threshold: number | undefined;

    if (result.balance <= SMS_CRITICAL_THRESHOLD) {
      status = 'critical';
      threshold = SMS_CRITICAL_THRESHOLD;
      message = `SMS credits critically low: ${result.balance} remaining. Refill immediately!`;
    } else if (result.balance <= SMS_WARNING_THRESHOLD) {
      status = 'warning';
      threshold = SMS_WARNING_THRESHOLD;
      message = `SMS credits running low: ${result.balance} remaining. Consider refilling soon.`;
    }

    return {
      provider: result.provider,
      balance: result.balance,
      status,
      threshold,
      message,
    };
  }),

  /**
   * Check email credits (tracked locally)
   * Counts emails sent today and compares against daily quota
   */
  checkEmailCredits: protectedProcedure.query(async () => {
    try {
      // Count emails sent today from email_logs table (if it exists)
      // For now, return a placeholder - this needs email tracking implementation
      const dailyQuota = 100; // Free tier default
      const emailsSentToday = 0; // TODO: Query from email_logs table
      const remaining = dailyQuota - emailsSentToday;

      let status: 'ok' | 'warning' | 'critical' = 'ok';
      let message: string | undefined;
      let threshold: number | undefined;

      if (remaining <= EMAIL_CRITICAL_THRESHOLD) {
        status = 'critical';
        threshold = EMAIL_CRITICAL_THRESHOLD;
        message = `Email quota critically low: ${remaining} emails remaining today. Upgrade plan or wait for reset.`;
      } else if (remaining <= EMAIL_WARNING_THRESHOLD) {
        status = 'warning';
        threshold = EMAIL_WARNING_THRESHOLD;
        message = `Email quota running low: ${remaining} emails remaining today.`;
      }

      return {
        provider: 'resend',
        balance: remaining,
        status,
        threshold,
        message,
        dailyQuota,
        sent: emailsSentToday,
      };
    } catch (error: any) {
      console.error('[Credit Monitoring] Email credit check error:', error);
      return {
        provider: 'resend',
        balance: 0,
        status: 'critical' as const,
        message: 'Failed to check email credits',
        dailyQuota: 100,
        sent: 0,
      };
    }
  }),

  /**
   * Get combined credit status for dashboard display
   */
  getCreditStatus: protectedProcedure.query(async () => {
    const smsCredits = await checkSMSCreditBalance();
    
    // Determine SMS status
    let smsStatus: CreditStatus = {
      provider: smsCredits.provider,
      balance: smsCredits.balance,
      status: 'ok',
    };

    if (!smsCredits.success) {
      smsStatus.status = 'critical';
      smsStatus.message = smsCredits.error || 'Failed to check SMS credits';
    } else if (smsCredits.balance <= SMS_CRITICAL_THRESHOLD) {
      smsStatus.status = 'critical';
      smsStatus.threshold = SMS_CRITICAL_THRESHOLD;
      smsStatus.message = `SMS credits critically low: ${smsCredits.balance} remaining`;
    } else if (smsCredits.balance <= SMS_WARNING_THRESHOLD) {
      smsStatus.status = 'warning';
      smsStatus.threshold = SMS_WARNING_THRESHOLD;
      smsStatus.message = `SMS credits running low: ${smsCredits.balance} remaining`;
    }

    // Email status (placeholder for now)
    const emailStatus: CreditStatus = {
      provider: 'resend',
      balance: 100, // Placeholder
      status: 'ok',
    };

    return {
      sms: smsStatus,
      email: emailStatus,
      hasAlerts: smsStatus.status !== 'ok' || emailStatus.status !== 'ok',
    };
  }),
});
