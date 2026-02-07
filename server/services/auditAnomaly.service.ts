import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { and, gte, eq, desc } from 'drizzle-orm';
import { getResendClient } from '../email';
import { ENV } from '../_core/env';

/**
 * Anomaly detection rules and thresholds
 */
export const ANOMALY_RULES = {
  // Multiple failed operations from same user in short time
  MULTIPLE_FAILURES: {
    threshold: 3,
    timeWindowMinutes: 5,
    severity: 'high' as const,
  },
  // Administrative actions during after-hours (10 PM - 6 AM)
  AFTER_HOURS_ADMIN: {
    startHour: 22, // 10 PM
    endHour: 6,    // 6 AM
    severity: 'medium' as const,
  },
  // Bulk deletions in short time
  BULK_DELETIONS: {
    threshold: 5,
    timeWindowMinutes: 1,
    severity: 'high' as const,
  },
  // Rapid successive actions from same user
  RAPID_ACTIONS: {
    threshold: 10,
    timeWindowMinutes: 1,
    severity: 'low' as const,
  },
  // Multiple user deletions
  USER_DELETIONS: {
    threshold: 2,
    timeWindowMinutes: 10,
    severity: 'critical' as const,
  },
};

export type AnomalyType = 
  | 'multiple_failures'
  | 'after_hours_admin'
  | 'bulk_deletions'
  | 'rapid_actions'
  | 'user_deletions';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyDetection {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details: {
    userId: number;
    userName: string;
    count: number;
    timeWindow?: string;
    actions?: string[];
  };
}

/**
 * Check if current time is after hours
 */
function isAfterHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const { startHour, endHour } = ANOMALY_RULES.AFTER_HOURS_ADMIN;
  
  return hour >= startHour || hour < endHour;
}

/**
 * Detect multiple failed operations from same user
 */
async function detectMultipleFailures(userId: number, userName: string): Promise<AnomalyDetection | null> {
  const db = await getDb();
  if (!db) return null;

  const { threshold, timeWindowMinutes } = ANOMALY_RULES.MULTIPLE_FAILURES;
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  // Count recent failed operations (we'll track these with a specific action pattern)
  const recentFailures = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        gte(auditLogs.createdAt, timeWindow)
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(threshold + 1);

  // Check if there are failed operations (you can add a 'status' field to track this)
  // For now, we'll check for rapid successive actions as a proxy
  if (recentFailures.length >= threshold) {
    return {
      type: 'multiple_failures',
      severity: ANOMALY_RULES.MULTIPLE_FAILURES.severity,
      message: `Multiple operations detected from ${userName} in ${timeWindowMinutes} minutes`,
      details: {
        userId,
        userName,
        count: recentFailures.length,
        timeWindow: `${timeWindowMinutes} minutes`,
        actions: recentFailures.map(log => log.action).filter((a): a is string => a !== null),
      },
    };
  }

  return null;
}

/**
 * Detect after-hours administrative changes
 */
async function detectAfterHoursAdmin(
  userId: number,
  userName: string,
  action: string,
  entityType: string
): Promise<AnomalyDetection | null> {
  if (!isAfterHours()) return null;

  // Only alert for sensitive operations
  const sensitiveActions = ['delete', 'bulk_update', 'bulk_delete', 'update'];
  const sensitiveEntities = ['user', 'settings', 'menu_item', 'order'];

  if (sensitiveActions.includes(action) || sensitiveEntities.includes(entityType)) {
    const now = new Date();
    return {
      type: 'after_hours_admin',
      severity: ANOMALY_RULES.AFTER_HOURS_ADMIN.severity,
      message: `After-hours administrative action by ${userName} at ${now.toLocaleTimeString()}`,
      details: {
        userId,
        userName,
        count: 1,
        actions: [action],
      },
    };
  }

  return null;
}

/**
 * Detect bulk deletions in short time
 */
async function detectBulkDeletions(userId: number, userName: string): Promise<AnomalyDetection | null> {
  const db = await getDb();
  if (!db) return null;

  const { threshold, timeWindowMinutes } = ANOMALY_RULES.BULK_DELETIONS;
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentDeletions = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.action, 'delete'),
        gte(auditLogs.createdAt, timeWindow)
      )
    )
    .orderBy(desc(auditLogs.createdAt));

  if (recentDeletions.length >= threshold) {
    return {
      type: 'bulk_deletions',
      severity: ANOMALY_RULES.BULK_DELETIONS.severity,
      message: `Bulk deletions detected: ${recentDeletions.length} items deleted by ${userName} in ${timeWindowMinutes} minute(s)`,
      details: {
        userId,
        userName,
        count: recentDeletions.length,
        timeWindow: `${timeWindowMinutes} minute(s)`,
        actions: recentDeletions.map(log => `${log.entityType}:${log.entityName || log.entityId}`).filter((a): a is string => a !== null),
      },
    };
  }

  return null;
}

/**
 * Detect rapid successive actions
 */
async function detectRapidActions(userId: number, userName: string): Promise<AnomalyDetection | null> {
  const db = await getDb();
  if (!db) return null;

  const { threshold, timeWindowMinutes } = ANOMALY_RULES.RAPID_ACTIONS;
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentActions = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        gte(auditLogs.createdAt, timeWindow)
      )
    )
    .orderBy(desc(auditLogs.createdAt));

  if (recentActions.length >= threshold) {
    return {
      type: 'rapid_actions',
      severity: ANOMALY_RULES.RAPID_ACTIONS.severity,
      message: `Rapid actions detected: ${recentActions.length} actions by ${userName} in ${timeWindowMinutes} minute(s)`,
      details: {
        userId,
        userName,
        count: recentActions.length,
        timeWindow: `${timeWindowMinutes} minute(s)`,
        actions: recentActions.map(log => log.action).filter((a): a is string => a !== null),
      },
    };
  }

  return null;
}

/**
 * Detect multiple user deletions
 */
async function detectUserDeletions(userId: number, userName: string): Promise<AnomalyDetection | null> {
  const db = await getDb();
  if (!db) return null;

  const { threshold, timeWindowMinutes } = ANOMALY_RULES.USER_DELETIONS;
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentUserDeletions = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.action, 'delete'),
        eq(auditLogs.entityType, 'user'),
        gte(auditLogs.createdAt, timeWindow)
      )
    )
    .orderBy(desc(auditLogs.createdAt));

  if (recentUserDeletions.length >= threshold) {
    return {
      type: 'user_deletions',
      severity: ANOMALY_RULES.USER_DELETIONS.severity,
      message: `CRITICAL: Multiple user deletions detected - ${recentUserDeletions.length} users deleted by ${userName} in ${timeWindowMinutes} minutes`,
      details: {
        userId,
        userName,
        count: recentUserDeletions.length,
        timeWindow: `${timeWindowMinutes} minutes`,
        actions: recentUserDeletions.map(log => log.entityName || log.entityId?.toString() || 'unknown').filter((a): a is string => a !== null),
      },
    };
  }

  return null;
}

/**
 * Run all anomaly detection checks
 */
export async function detectAnomalies(
  userId: number,
  userName: string,
  action: string,
  entityType: string
): Promise<AnomalyDetection[]> {
  const anomalies: AnomalyDetection[] = [];

  try {
    // Run all detection checks
    const checks = await Promise.all([
      detectMultipleFailures(userId, userName),
      detectAfterHoursAdmin(userId, userName, action, entityType),
      detectBulkDeletions(userId, userName),
      detectRapidActions(userId, userName),
      detectUserDeletions(userId, userName),
    ]);

    // Filter out null results
    checks.forEach(anomaly => {
      if (anomaly) anomalies.push(anomaly);
    });

    // Send alerts for detected anomalies
    for (const anomaly of anomalies) {
      await sendAnomalyAlert(anomaly);
    }
  } catch (error) {
    console.error('[Anomaly Detection] Error detecting anomalies:', error);
  }

  return anomalies;
}

/**
 * Send alert email for detected anomaly
 */
async function sendAnomalyAlert(anomaly: AnomalyDetection): Promise<void> {
  const severityColors = {
    low: '#3b82f6',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };

  const severityLabels = {
    low: 'Low Priority',
    medium: 'Medium Priority',
    high: 'High Priority',
    critical: '🚨 CRITICAL ALERT',
  };

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${severityColors[anomaly.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${severityLabels[anomaly.severity]}</h2>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Anomaly Detected in Audit Logs</p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h3 style="margin-top: 0; color: #111827;">Alert Details</h3>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          <strong>${anomaly.message}</strong>
        </p>
        
        <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 40%;">User:</td>
              <td style="padding: 8px 0; color: #111827;"><strong>${anomaly.details.userName}</strong> (ID: ${anomaly.details.userId})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Action Count:</td>
              <td style="padding: 8px 0; color: #111827;">${anomaly.details.count}</td>
            </tr>
            ${anomaly.details.timeWindow ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Time Window:</td>
              <td style="padding: 8px 0; color: #111827;">${anomaly.details.timeWindow}</td>
            </tr>
            ` : ''}
            ${anomaly.details.actions && anomaly.details.actions.length > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Actions:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${anomaly.details.actions.filter((a): a is string => a !== null).slice(0, 5).join(', ')}
                ${anomaly.details.actions.length > 5 ? `<br/><em>...and ${anomaly.details.actions.length - 5} more</em>` : ''}
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          This is an automated alert from your restaurant management system. 
          Please review the audit logs for more details and take appropriate action if necessary.
        </p>
        
        <p style="color: #9ca3af; font-size: 12px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          Detected at: ${new Date().toLocaleString()}<br/>
          Anomaly Type: ${anomaly.type.replace(/_/g, ' ').toUpperCase()}
        </p>
      </div>
    </div>
  `;

  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('[Anomaly Alert] Resend client not available');
      return;
    }

    await resend.emails.send({
      from: 'Boomiis Restaurant <orders@boomiis.com>',
      to: ENV.adminEmail,
      subject: `[${severityLabels[anomaly.severity]}] Security Anomaly Detected`,
      html: htmlContent,
    });
  } catch (error) {
    console.error('[Anomaly Alert] Failed to send email:', error);
  }
}
