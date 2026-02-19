import { getResendClient, FROM_EMAIL } from '../email';
import { sendSMS } from './sms.service';
import { ENV } from '../_core/env';

interface CreditAlertOptions {
  provider: string;
  balance: number;
  threshold: number;
  level: 'warning' | 'critical';
}

/**
 * Send email alert to admin about low credits
 */
export async function sendLowCreditEmailAlert(options: CreditAlertOptions): Promise<boolean> {
  try {
    const { provider, balance, threshold, level } = options;
    
    const subject = level === 'critical' 
      ? `🚨 URGENT: ${provider.toUpperCase()} Credits Critically Low`
      : `⚠️ Warning: ${provider.toUpperCase()} Credits Running Low`;

    const message = level === 'critical'
      ? `Your ${provider.toUpperCase()} credit balance has reached a critical level.\n\n` +
        `Current Balance: ${balance} credits\n` +
        `Critical Threshold: ${threshold} credits\n\n` +
        `Action Required: Please refill your ${provider.toUpperCase()} credits immediately to avoid service disruption.\n\n` +
        `Without sufficient credits, you will not be able to send ${provider === 'resend' ? 'emails' : 'SMS messages'} to customers.`
      : `Your ${provider.toUpperCase()} credit balance is running low.\n\n` +
        `Current Balance: ${balance} credits\n` +
        `Warning Threshold: ${threshold} credits\n\n` +
        `Recommendation: Consider refilling your ${provider.toUpperCase()} credits soon to ensure uninterrupted service.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${level === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">
            ${level === 'critical' ? '🚨 URGENT' : '⚠️ Warning'}: Low ${provider.toUpperCase()} Credits
          </h1>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            ${message.split('\n\n').map(p => `<p style="margin-bottom: 16px;">${p.replace(/\n/g, '<br>')}</p>`).join('')}
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid ${level === 'critical' ? '#dc2626' : '#f59e0b'};">
            <h3 style="margin-top: 0; color: #111827;">Credit Status</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Provider:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${provider.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Current Balance:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: ${level === 'critical' ? '#dc2626' : '#f59e0b'};">${balance} credits</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Threshold:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${threshold} credits</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Alert Level:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; text-transform: uppercase;">${level}</td>
              </tr>
            </table>
          </div>

          ${level === 'critical' ? `
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">
                ⚠️ Service Disruption Risk: Without immediate action, you may lose the ability to communicate with customers via ${provider === 'resend' ? 'email' : 'SMS'}.
              </p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280; margin: 0;">
              This is an automated alert from your Boomiis Restaurant Management System.
            </p>
          </div>
        </div>
      </div>
    `;

    const resend = getResendClient();
    if (!resend) {
      console.error('[Credit Alerts] Resend client not available');
      return false;
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ENV.adminEmail,
      subject,
      text: message,
      html,
    });

    console.log(`[Credit Alerts] ${level.toUpperCase()} email alert sent for ${provider}`);
    return true;
  } catch (error: any) {
    console.error('[Credit Alerts] Failed to send email alert:', error);
    return false;
  }
}

/**
 * Send SMS alert to admin about critically low credits
 * Only sends for CRITICAL level to avoid SMS spam
 */
export async function sendLowCreditSMSAlert(options: CreditAlertOptions): Promise<boolean> {
  try {
    // Only send SMS for critical alerts
    if (options.level !== 'critical') {
      return false;
    }

    const { provider, balance } = options;
    
    // Get admin phone from environment or database
    // For now, we'll skip SMS if no admin phone is configured
    // TODO: Add admin phone to settings
    const adminPhone = ''; // ENV.ADMIN_PHONE;

    if (!adminPhone) {
      console.log('[Credit Alerts] Admin phone not configured, skipping SMS alert');
      return false;
    }

    const message = `URGENT: ${provider.toUpperCase()} credits critically low (${balance} remaining). Refill immediately to avoid service disruption.`;

    await sendSMS({
      to: adminPhone,
      message,
    });

    console.log(`[Credit Alerts] CRITICAL SMS alert sent for ${provider}`);
    return true;
  } catch (error: any) {
    console.error('[Credit Alerts] Failed to send SMS alert:', error);
    return false;
  }
}

/**
 * Check if alert should be sent based on last alert time
 * Prevents spam by ensuring minimum time between alerts (6 hours)
 */
const lastAlertTimes: Record<string, number> = {};
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export function shouldSendAlert(provider: string, level: 'warning' | 'critical'): boolean {
  const key = `${provider}-${level}`;
  const now = Date.now();
  const lastAlert = lastAlertTimes[key] || 0;

  if (now - lastAlert < ALERT_COOLDOWN_MS) {
    return false;
  }

  lastAlertTimes[key] = now;
  return true;
}
