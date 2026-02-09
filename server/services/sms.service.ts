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
 * Send SMS and log to database for tracking
 * @param params - SMS parameters including template type and metadata
 * @returns Promise with SMS send result
 */
export async function sendAndLogSMS(params: {
  to: string;
  message: string;
  templateType: string;
  recipientName?: string;
  metadata?: Record<string, any>;
}): Promise<SMSResult> {
  const result = await sendSMS({ to: params.to, message: params.message });
  
  // Log SMS to database
  const { logSMS } = await import('./sms-logger');
  await logSMS({
    templateType: params.templateType,
    recipientPhone: params.to,
    recipientName: params.recipientName,
    message: params.message,
    provider: (result.provider as 'bulksms' | 'textlocal') || 'bulksms',
    providerId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
    metadata: params.metadata,
  });
  
  return result;
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
  
  const result = await sendAndLogSMS({
    to: customerPhone,
    message,
    templateType: 'order_ready',
    recipientName: customerName,
    metadata: { orderNumber },
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
  
  const result = await sendAndLogSMS({
    to: customerPhone,
    message,
    templateType: 'out_for_delivery',
    recipientName: customerName,
    metadata: { orderNumber, estimatedMinutes },
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
 * @param smsOptIn - Customer's SMS notification preference (GDPR compliance)
 */
export async function sendOrderStatusSMS(
  customerName: string,
  customerPhone: string,
  orderNumber: string,
  templateType: string,
  estimatedMinutes: number = 30,
  smsOptIn: boolean = true
): Promise<void> {
  // Check if customer has opted out of SMS notifications (GDPR)
  if (!smsOptIn) {
    console.log(`[SMS] Customer opted out of SMS notifications for order ${orderNumber}, skipping`);
    return;
  }
  
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
      case 'order_completed':
        message = `Thank you for your order #${orderNumber}, ${customerName}! We hope you enjoyed your meal from Boomiis Restaurant. We'd love to see you again soon!`;
        break;
      case 'review_request':
        message = `Hi ${customerName}! How was your meal from order #${orderNumber}? We'd love to hear your feedback! Leave a review at: ${process.env.BASE_URL || 'https://boomiis.manus.space'}/reviews`;
        break;
      default:
        console.warn(`[SMS] Unknown template type: ${templateType}`);
        return;
    }
  }
  
  const result = await sendAndLogSMS({
    to: customerPhone,
    message,
    templateType,
    recipientName: customerName,
    metadata: { orderNumber, estimatedMinutes },
  });
  
  if (result.success) {
    console.log(`[SMS] Order status notification (${templateType}) sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send order status notification (${templateType}): ${result.error}`);
  }
}

/**
 * Send SMS notification for reservation status changes
 * @param customerName - Customer's name
 * @param customerPhone - Customer's phone number (E.164 format)
 * @param reservationDate - Reservation date
 * @param reservationTime - Reservation time
 * @param status - Reservation status (pending, confirmed, cancelled, completed)
 */
export async function sendReservationStatusSMS(
  customerName: string,
  customerPhone: string,
  reservationDate: Date,
  reservationTime: string,
  status: string
): Promise<void> {
  const { format } = await import('date-fns');
  const formattedDate = format(reservationDate, 'MMM dd, yyyy');
  
  let message = '';
  let templateType = '';
  
  switch (status) {
    case 'confirmed':
      templateType = 'reservation_confirmed';
      message = `Hi ${customerName}, your reservation at Boomiis Restaurant is CONFIRMED for ${formattedDate} at ${reservationTime}. We look forward to serving you! Reply STOP to opt out.`;
      break;
    case 'cancelled':
      templateType = 'reservation_cancelled';
      message = `Hi ${customerName}, your reservation at Boomiis Restaurant for ${formattedDate} at ${reservationTime} has been CANCELLED. Contact us if you have questions. Reply STOP to opt out.`;
      break;
    case 'completed':
      templateType = 'reservation_completed';
      message = `Thank you for dining with us, ${customerName}! We hope you enjoyed your experience at Boomiis Restaurant. We'd love to see you again soon! Reply STOP to opt out.`;
      break;
    case 'reminder':
      templateType = 'reservation_reminder';
      message = `Reminder: You have a reservation TOMORROW at Boomiis Restaurant on ${formattedDate} at ${reservationTime}. We look forward to seeing you! Reply STOP to opt out.`;
      break;
    default:
      message = `Hi ${customerName}, your reservation at Boomiis Restaurant for ${formattedDate} at ${reservationTime} has been updated. Status: ${status}. Reply STOP to opt out.`;
  }
  
  // Try to get custom template from database if templateType is set
  if (templateType) {
    const customTemplate = await getSmsTemplateByType(templateType);
    if (customTemplate) {
      message = customTemplate.message
        .replace(/{{customerName}}/g, customerName)
        .replace(/{{reservationDate}}/g, formattedDate)
        .replace(/{{reservationTime}}/g, reservationTime);
    }
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Reservation ${status} notification sent to ${customerPhone}`);
  } else {
    console.error(`[SMS] Failed to send reservation ${status} notification: ${result.error}`);
  }
}

/**
 * Send SMS notification to admin for new orders
 * @param adminPhone - Admin's phone number (E.164 format)
 * @param orderNumber - Order number
 * @param orderTotal - Order total amount
 * @param orderType - Order type (delivery or pickup)
 */
export async function sendAdminNewOrderSMS(
  adminPhone: string,
  orderNumber: string,
  orderTotal: number,
  orderType: string
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('admin_new_order');
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    // Match variable names to template placeholders: {{total}}, {{orderNumber}}, {{orderType}}
    message = replaceTemplateVariables(template.message, {
      orderNumber,
      total: orderTotal.toFixed(2),
      orderType,
    });
  } else {
    // Fallback to default message
    message = `[Boomiis] New ${orderType} order #${orderNumber} received! Total: £${orderTotal.toFixed(2)}. Check admin panel for details.`;
  }
  
  const result = await sendSMS({
    to: adminPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Admin new order notification sent to ${adminPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send admin new order notification: ${result.error}`);
  }
}

/**
 * Send SMS notification to admin for weekly sales report
 * @param adminPhone - Admin's phone number (E.164 format)
 * @param totalOrders - Total number of orders this week
 * @param totalRevenue - Total revenue this week
 * @param topItem - Best-selling item this week
 */
export async function sendAdminWeeklyReportSMS(
  adminPhone: string,
  totalOrders: number,
  totalRevenue: number,
  topItem: string
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('admin_weekly_report');
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      topItem,
    });
  } else {
    // Fallback to default message
    message = `[Boomiis] Weekly Report: ${totalOrders} orders, £${totalRevenue.toFixed(2)} revenue. Top item: ${topItem}. Full report in admin panel.`;
  }
  
  const result = await sendSMS({
    to: adminPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Admin weekly report sent to ${adminPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send admin weekly report: ${result.error}`);
  }
}

/**
 * Send SMS confirmation for newsletter subscription
 * @param customerName - Customer's name
 * @param customerPhone - Customer's phone number (E.164 format)
 * @param customerEmail - Customer's email address
 */
export async function sendNewsletterConfirmationSMS(
  customerName: string,
  customerPhone: string,
  customerEmail: string
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('newsletter_confirmation');
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      customerEmail,
    });
  } else {
    // Fallback to default message
    message = `Hi ${customerName}! You're now subscribed to Boomiis Restaurant newsletter at ${customerEmail}. Get ready for exclusive offers and updates!`;
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Newsletter confirmation sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send newsletter confirmation: ${result.error}`);
  }
}

/**
 * Send SMS notification for event confirmation
 * @param customerName - Customer's name
 * @param customerPhone - Customer's phone number (E.164 format)
 * @param eventType - Type of event
 * @param eventDate - Event date
 * @param guestCount - Number of guests
 */
export async function sendEventConfirmationSMS(
  customerName: string,
  customerPhone: string,
  eventType: string,
  eventDate: Date,
  guestCount: number
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('event_confirmation');
  
  const formattedDate = eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      eventType,
      eventDate: formattedDate,
      guestCount,
    });
  } else {
    // Fallback to default message
    message = `Hi ${customerName}! Your ${eventType} event at Boomiis Restaurant is confirmed for ${formattedDate} with ${guestCount} guests. We're excited to host you!`;
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Event confirmation sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send event confirmation: ${result.error}`);
  }
}

/**
 * Send SMS response to event inquiry
 * @param customerName - Customer's name
 * @param customerPhone - Customer's phone number (E.164 format)
 * @param eventType - Type of event
 * @param responseMessage - Custom response message from admin
 */
export async function sendEventInquiryResponseSMS(
  customerName: string,
  customerPhone: string,
  eventType: string,
  responseMessage: string
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('event_inquiry_response');
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      eventType,
      responseMessage,
    });
  } else {
    // Fallback to default message
    message = `Hi ${customerName}! Regarding your ${eventType} inquiry at Boomiis: ${responseMessage}. Check your email for full details.`;
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Event inquiry response sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send event inquiry response: ${result.error}`);
  }
}

/**
 * Send SMS notification for catering quote request
 * @param customerName - Customer's name
 * @param customerPhone - Customer's phone number (E.164 format)
 * @param cateringType - Type of catering service
 * @param guestCount - Number of guests
 * @param eventDate - Event date
 */
export async function sendCateringQuoteRequestSMS(
  customerName: string,
  customerPhone: string,
  cateringType: string,
  guestCount: number,
  eventDate: Date
): Promise<void> {
  // Try to get custom template from database
  const template = await getSmsTemplateByType('catering_quote_request');
  
  const formattedDate = eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  let message: string;
  if (template && template.isActive) {
    // Use custom template with variable replacement
    message = replaceTemplateVariables(template.message, {
      customerName,
      cateringType,
      guestCount,
      eventDate: formattedDate,
    });
  } else {
    // Fallback to default message
    message = `Hi ${customerName}! We received your catering quote request for ${cateringType} on ${formattedDate} (${guestCount} guests). We'll send you a detailed quote via email within 24 hours!`;
  }
  
  const result = await sendSMS({
    to: customerPhone,
    message,
  });
  
  if (result.success) {
    console.log(`[SMS] Catering quote request confirmation sent to ${customerPhone} via ${result.provider}`);
  } else {
    console.error(`[SMS] Failed to send catering quote request confirmation: ${result.error}`);
  }
}
