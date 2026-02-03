import twilio from 'twilio';
import { ENV } from '../_core/env';
import { getSmsTemplateByType } from '../db';

// SMS Provider type
type SMSProvider = 'bulksms' | 'twilio' | 'none';

// Get configured SMS provider
function getSMSProvider(): SMSProvider {
  const provider = ENV.smsProvider?.toLowerCase();
  
  if (provider === 'bulksms' && ENV.bulksmsTokenId && ENV.bulksmsTokenSecret) {
    return 'bulksms';
  }
  
  if (provider === 'twilio' && ENV.twilioAccountSid && ENV.twilioAuthToken) {
    return 'twilio';
  }
  
  // Auto-detect based on available credentials
  if (ENV.bulksmsTokenId && ENV.bulksmsTokenSecret) {
    return 'bulksms';
  }
  
  if (ENV.twilioAccountSid && ENV.twilioAuthToken) {
    return 'twilio';
  }
  
  return 'none';
}

// Initialize Twilio client (lazy loading)
let twilioClient: ReturnType<typeof twilio> | null = null;
const getTwilioClient = () => {
  if (twilioClient) return twilioClient;
  
  const accountSid = ENV.twilioAccountSid;
  const authToken = ENV.twilioAuthToken;
  
  if (!accountSid || !authToken) {
    return null;
  }
  
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

interface SendSMSParams {
  to: string;
  message: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

/**
 * Format phone number to E.164 format (required by both BulkSMS and Twilio)
 * @param phone - Phone number in various formats
 * @returns E.164 formatted number (e.g., +447911123456)
 */
export function formatPhoneNumberE164(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with 0, assume UK number and replace with +44
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    // If starts with 44, add +
    if (cleaned.startsWith('44')) {
      cleaned = '+' + cleaned;
    } else {
      // Assume UK and add +44
      cleaned = '+44' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Send SMS via BulkSMS
 */
async function sendViaBulkSMS({ to, message }: SendSMSParams): Promise<SMSResult> {
  const tokenId = ENV.bulksmsTokenId;
  const tokenSecret = ENV.bulksmsTokenSecret;
  
  if (!tokenId || !tokenSecret) {
    return { success: false, error: 'BulkSMS credentials not configured', provider: 'bulksms' };
  }
  
  try {
    const formattedNumber = formatPhoneNumberE164(to);
    
    // Create Basic Auth credentials
    const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64');
    
    const response = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        to: formattedNumber,
        body: message,
        from: 'Boomiis', // Approved alphanumeric sender ID
      }),
    });
    
    const data = await response.json();
    
    console.log(`[SMS][BulkSMS] API Response - Status: ${response.status}, Data:`, JSON.stringify(data));
    console.log(`[SMS][BulkSMS] Sent to number: ${formattedNumber}`);
    
    if (response.status === 201 && Array.isArray(data) && data.length > 0) {
      const sentMessage = data[0];
      console.log(`[SMS][BulkSMS] Message sent successfully: ${sentMessage.id}`);
      return {
        success: true,
        messageId: sentMessage.id,
        provider: 'bulksms',
      };
    } else {
      const errorMsg = data.detail || data.title || 'Unknown error';
      console.error(`[SMS][BulkSMS] Failed to send SMS:`, errorMsg, data);
      return {
        success: false,
        error: errorMsg,
        provider: 'bulksms',
      };
    }
  } catch (error: any) {
    console.error('[SMS][BulkSMS] Exception:', error.message);
    return {
      success: false,
      error: error.message,
      provider: 'bulksms',
    };
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio({ to, message }: SendSMSParams): Promise<SMSResult> {
  const client = getTwilioClient();
  
  if (!client) {
    return { success: false, error: 'Twilio not configured', provider: 'twilio' };
  }
  
  const fromNumber = ENV.twilioPhoneNumber;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured', provider: 'twilio' };
  }
  
  try {
    const formattedNumber = formatPhoneNumberE164(to);
    
    const twilioMessage = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedNumber,
    });
    
    console.log(`[SMS][Twilio] Message sent successfully: ${twilioMessage.sid}`);
    return {
      success: true,
      messageId: twilioMessage.sid,
      provider: 'twilio',
    };
  } catch (error: any) {
    console.error('[SMS][Twilio] Failed to send SMS:', error.message);
    return {
      success: false,
      error: error.message,
      provider: 'twilio',
    };
  }
}

/**
 * Send SMS notification to customer using configured provider
 * @param to - Customer phone number
 * @param message - SMS message content
 * @returns Promise with SMS send result
 */
export async function sendSMS({ to, message }: SendSMSParams): Promise<SMSResult> {
  const provider = getSMSProvider();
  
  if (provider === 'none') {
    console.log('[SMS] No SMS provider configured - skipping SMS send');
    return { success: false, error: 'No SMS provider configured', provider: 'none' };
  }
  
  console.log(`[SMS] Using provider: ${provider}`);
  
  if (provider === 'bulksms') {
    return sendViaBulkSMS({ to, message });
  }
  
  if (provider === 'twilio') {
    return sendViaTwilio({ to, message });
  }
  
  return { success: false, error: 'Invalid SMS provider', provider: 'none' };
}

/**
 * Replace template variables in SMS message
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return message;
}

/**
 * Send SMS notification when order is ready for pickup
 */
export async function sendOrderReadyForPickupSMS(
  customerName: string,
  customerPhone: string,
  orderNumber: string
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('order_ready');
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      orderNumber,
    });
  } else {
    // Fallback to default message
    message = `Hi ${customerName}! Your order #${orderNumber} is ready for pickup at Boomiis Restaurant. See you soon!`;
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Order ready notification sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send order ready notification: ${result.error}`);
  }
}

/**
 * Send SMS notification when order is out for delivery
 */
export async function sendOrderOutForDeliverySMS(
  customerName: string,
  customerPhone: string,
  orderNumber: string,
  estimatedMinutes: number = 30
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('out_for_delivery');
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      orderNumber,
      estimatedMinutes,
    });
  } else {
    // Fallback to default message
    message = `Hi ${customerName}! Your order #${orderNumber} is out for delivery and will arrive in approximately ${estimatedMinutes} minutes.`;
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Out for delivery notification sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send out for delivery notification: ${result.error}`);
  }
}

/**
 * Send SMS notification for any order status change
 * @param customerName - Customer's name
 * @param customerPhone - Customer's phone number (E.164 format)
 * @param orderNumber - Order number
 * @param templateType - SMS template type (order_confirmed, order_preparing, order_ready, etc.)
 * @param estimatedMinutes - Estimated time in minutes (optional, defaults to 30)
 */
export async function sendOrderStatusSMS(
  customerName: string,
  customerPhone: string,
  orderNumber: string,
  templateType: string,
  estimatedMinutes: number = 30
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType(templateType);
  
  // If template exists but is inactive, skip sending SMS
  if (template && !template.isActive) {
    console.log(`[SMS] Template '${templateType}' is inactive, skipping SMS notification`);
    return;
  }
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      orderNumber,
      estimatedMinutes,
    });
  } else {
    // Fallback to default messages if no custom template exists
    switch (templateType) {
      case 'order_confirmed':
        message = `Hi ${customerName}! Your order #${orderNumber} has been confirmed. We'll notify you when it's ready!`;
        break;
      case 'order_preparing':
        message = `Good news! Your order #${orderNumber} is now being prepared by our chefs at Boomiis Restaurant.`;
        break;
      case 'order_ready':
        message = `Hi ${customerName}! Your order #${orderNumber} is ready for pickup at Boomiis Restaurant. See you soon!`;
        break;
      case 'out_for_delivery':
        message = `Hi ${customerName}! Your order #${orderNumber} is out for delivery and will arrive in approximately ${estimatedMinutes} minutes.`;
        break;
      case 'order_delivered':
        message = `Your order #${orderNumber} has been delivered. Enjoy your meal from Boomiis Restaurant! Please rate your experience.`;
        break;
      case 'order_delayed':
        message = `Hi ${customerName}, your order #${orderNumber} is taking a bit longer than expected. New estimated time: ${estimatedMinutes} minutes. Sorry for the wait!`;
        break;
      case 'order_cancelled':
        message = `Your order #${orderNumber} has been cancelled. If you have questions, please contact Boomiis Restaurant.`;
        break;
      default:
        console.warn(`[SMS] Unknown template type: ${templateType}`);
        return;
    }
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Order status notification (${templateType}) sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send order status notification (${templateType}): ${result.error}`);
  }
}
