import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { isCriticalAction, sendAuditAlert } from './auditAlerts.service';

export interface AuditLogData {
  userId: number;
  userName: string;
  userRole: string;
  action: string; // 'create', 'update', 'delete', 'status_change', 'bulk_update', etc.
  entityType: string; // 'order', 'menu_item', 'user', 'settings', 'reservation', etc.
  entityId?: string | number;
  entityName?: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit action to the database
 */
export async function logAuditAction(data: AuditLogData): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Audit] Database not available');
      return;
    }

    await db.insert(auditLogs).values({
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId?.toString(),
      entityName: data.entityName,
      changes: data.changes ? JSON.stringify(data.changes) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    console.log(`[Audit] Logged ${data.action} on ${data.entityType} by ${data.userName} (ID: ${data.userId})`);

    // Send email alert for critical actions
    if (isCriticalAction(data.action, data.entityType)) {
      // Get owner email from environment or use default admin email
      const ownerEmail = process.env.ADMIN_EMAIL || 'admin@boomiis.uk';
      
      await sendAuditAlert({
        action: data.action,
        entityType: data.entityType,
        entityName: data.entityName,
        userName: data.userName,
        userRole: data.userRole,
        changes: data.changes,
        ipAddress: data.ipAddress,
        ownerEmail,
      });
    }
  } catch (error) {
    // Don't throw errors - audit logging should not break the main operation
    console.error('[Audit] Failed to log action:', error);
  }
}

/**
 * Extract IP address from request headers
 * Handles proxies and load balancers
 */
export function getIpAddress(headers: Record<string, string | string[] | undefined>): string | undefined {
  // Check common headers for IP address (in order of preference)
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const header of ipHeaders) {
    const value = headers[header];
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = Array.isArray(value) ? value[0] : value;
      const firstIp = ip.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
  }

  return undefined;
}

/**
 * Create a changes object for audit logging
 */
export function createChangesObject(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldsToTrack?: string[]
): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};

  const fields = fieldsToTrack || Object.keys({ ...before, ...after });

  for (const field of fields) {
    const beforeValue = before[field];
    const afterValue = after[field];

    // Only log if value actually changed
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[field] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  }

  return changes;
}
