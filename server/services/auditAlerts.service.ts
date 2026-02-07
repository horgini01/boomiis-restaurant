import { getResendClient, FROM_EMAIL } from "../email";

// Define critical action types that trigger email alerts
export const CRITICAL_ACTIONS = {
  USER_DELETION: 'user_deletion',
  BULK_PRICE_UPDATE: 'bulk_price_update',
  SETTINGS_MODIFICATION: 'settings_modification',
  ROLE_CHANGE: 'role_change',
  DELIVERY_ZONE_CHANGE: 'delivery_zone_change',
  EMAIL_TEMPLATE_CHANGE: 'email_template_change',
  SMS_TEMPLATE_CHANGE: 'sms_template_change',
} as const;

export type CriticalAction = typeof CRITICAL_ACTIONS[keyof typeof CRITICAL_ACTIONS];

interface AuditAlertParams {
  action: string;
  entityType: string;
  entityName?: string;
  userName: string;
  userRole: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress?: string;
  ownerEmail: string;
}

/**
 * Determine if an action is critical and requires email alert
 */
export function isCriticalAction(action: string, entityType: string): boolean {
  // User deletions
  if (action === 'delete' && entityType === 'user') return true;
  
  // Bulk operations
  if (action === 'bulk_update') return true;
  
  // Settings modifications
  if (entityType === 'settings' || entityType === 'restaurant_settings') return true;
  
  // Role changes
  if (action === 'role_change' || (action === 'update' && entityType === 'user')) return true;
  
  // Delivery zone changes
  if (entityType === 'delivery_zone') return true;
  
  // Template changes
  if (entityType === 'email_template' || entityType === 'sms_template') return true;
  
  return false;
}

/**
 * Send email alert to owner about critical audit action
 */
export async function sendAuditAlert(params: AuditAlertParams): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.log('[Audit Alert] Skipping email - Resend not configured');
    return false;
  }

  try {
    const { action, entityType, entityName, userName, userRole, changes, ipAddress, ownerEmail } = params;

    // Build changes summary
    let changesSummary = '';
    if (changes && Object.keys(changes).length > 0) {
      changesSummary = '<h3>Changes Made:</h3><ul>';
      for (const [field, change] of Object.entries(changes)) {
        changesSummary += `<li><strong>${field}:</strong> ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}</li>`;
      }
      changesSummary += '</ul>';
    }

    // Determine alert severity
    const severity = action === 'delete' || action === 'bulk_update' ? 'HIGH' : 'MEDIUM';
    const severityColor = severity === 'HIGH' ? '#ef4444' : '#f59e0b';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Critical Audit Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔔 Critical Admin Action Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Severity: ${severity}</p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="margin-top: 0; color: #111827;">Action Details</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 140px;">Action:</td>
                <td style="padding: 8px 0;">${action.toUpperCase().replace('_', ' ')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Entity Type:</td>
                <td style="padding: 8px 0;">${entityType.replace('_', ' ')}</td>
              </tr>
              ${entityName ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Entity:</td>
                <td style="padding: 8px 0;">${entityName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Performed By:</td>
                <td style="padding: 8px 0;">${userName} (${userRole})</td>
              </tr>
              ${ipAddress ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">IP Address:</td>
                <td style="padding: 8px 0;">${ipAddress}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Timestamp:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            
            ${changesSummary}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                This is an automated alert for critical administrative actions. 
                Please review the audit logs for complete details.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `🔔 Critical Admin Action: ${action.toUpperCase()} on ${entityType}`,
      html,
    });

    console.log(`[Audit Alert] Sent ${severity} alert to ${ownerEmail} for ${action} on ${entityType}`);
    return true;
  } catch (error) {
    console.error('[Audit Alert] Failed to send email:', error);
    return false;
  }
}
