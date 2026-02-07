import { getDb } from '../db';
import { smsLogs } from '../../drizzle/schema';

interface LogSMSParams {
  templateType: string;
  recipientPhone: string;
  recipientName?: string;
  message: string;
  provider: 'bulksms' | 'textlocal';
  providerId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Calculate SMS cost based on provider and message length
 * 
 * Pricing (approximate as of 2026):
 * - BulkSMS UK: £0.04 per segment (160 chars)
 * - TextLocal UK: £0.035 per segment
 */
function calculateSMSCost(provider: 'bulksms' | 'textlocal', messageLength: number): number {
  const segmentCount = Math.ceil(messageLength / 160);
  
  const pricePerSegment = {
    bulksms: 0.04,
    textlocal: 0.035,
  };
  
  return segmentCount * pricePerSegment[provider];
}

/**
 * Log SMS send to database for tracking and analytics
 */
export async function logSMS(params: LogSMSParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[SMS Logger] Database not available, skipping log');
      return;
    }

    const messageLength = params.message.length;
    const segmentCount = Math.ceil(messageLength / 160);
    const cost = calculateSMSCost(params.provider, messageLength);

    await db.insert(smsLogs).values({
      templateType: params.templateType,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName || null,
      message: params.message,
      status: params.status,
      provider: params.provider,
      providerId: params.providerId || null,
      messageLength,
      segmentCount,
      costGBP: cost.toFixed(4),
      sentAt: new Date(),
      deliveredAt: params.status === 'delivered' ? new Date() : null,
      failedAt: params.status === 'failed' ? new Date() : null,
      errorMessage: params.errorMessage || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });

    console.log(`[SMS Logger] Logged ${params.templateType} SMS to ${params.recipientPhone} (${segmentCount} segments, £${cost.toFixed(4)})`);
  } catch (error: any) {
    console.error('[SMS Logger] Failed to log SMS:', error.message);
    // Don't throw - logging failure shouldn't break SMS sending
  }
}

/**
 * Update SMS log status after delivery confirmation
 */
export async function updateSMSStatus(
  providerId: string,
  status: 'delivered' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { eq } = await import('drizzle-orm');
    
    await db.update(smsLogs)
      .set({
        status,
        deliveredAt: status === 'delivered' ? new Date() : null,
        failedAt: status === 'failed' ? new Date() : null,
        errorMessage: errorMessage || null,
      })
      .where(eq(smsLogs.providerId, providerId));

    console.log(`[SMS Logger] Updated SMS ${providerId} status to ${status}`);
  } catch (error: any) {
    console.error('[SMS Logger] Failed to update SMS status:', error.message);
  }
}
