import twilio from 'twilio';
import { ENV } from '../_core/env';

// SMS Provider type
type SMSProvider = 'textlocal' | 'twilio' | 'none';

// Get configured SMS provider
function getSMSProvider(): SMSProvider {
  const provider = ENV.smsProvider?.toLowerCase();
  
  if (provider === 'textlocal' && ENV.textlocalApiKey) {
    return 'textlocal';
  }
  
  if (provider === 'twilio' && ENV.twilioAccountSid && ENV.twilioAuthToken) {
    return 'twilio';
  }
  
  // Auto-detect based on available credentials
  if (ENV.textlocalApiKey) {
    return 'textlocal';
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
 * Format phone number for Textlocal (UK format without + prefix)
 * @param phone - Phone number in various formats
 * @returns Formatted number for Textlocal (e.g., 447911123456)
 */
function formatPhoneForTextlocal(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with +44, remove the +
  if (phone.startsWith('+44')) {
    cleaned = '44' + cleaned.substring(2);
  }
  
  // If starts with 0 (UK local format), replace with 44
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1);
  }
  
  // If starts with 44, keep as is
  // Otherwise assume UK and prepend 44
  if (!cleaned.startsWith('44')) {
    cleaned = '44' + cleaned;
  }
  
  return cleaned;
}

/**
 * Format phone number to E.164 format for Twilio
 * @param phone - Phone number in various formats
 * @returns E.164 formatted number (e.g., +447911123456)
 */
export function formatPhoneNumberE164(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, assume UK number and replace with +44
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1);
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send SMS via Textlocal
 */
async function sendViaTextlocal({ to, message }: SendSMSParams): Promise<SMSResult> {
  const apiKey = ENV.textlocalApiKey;
  const sender = ENV.textlocalSender || 'Boomiis';
  
  if (!apiKey) {
    return { success: false, error: 'Textlocal API key not configured', provider: 'textlocal' };
  }
  
  try {
    const formattedNumber = formatPhoneForTextlocal(to);
    
    // Prepare form data
    const params = new URLSearchParams({
      apikey: apiKey,
      numbers: formattedNumber,
      message: message,
      sender: sender,
    });
    
    const response = await fetch('https://api.txtlocal.com/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      console.log(`[SMS][Textlocal] Message sent successfully: ${data.batch_id}`);
      return {
        success: true,
        messageId: data.batch_id?.toString(),
        provider: 'textlocal',
      };
    } else {
      const errorMsg = data.errors?.[0]?.message || 'Unknown error';
      console.error(`[SMS][Textlocal] Failed to send SMS:`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        provider: 'textlocal',
      };
    }
  } catch (error: any) {
    console.error('[SMS][Textlocal] Exception:', error.message);
    return {
      success: false,
      error: error.message,
      provider: 'textlocal',
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
  
  if (provider === 'textlocal') {
    return sendViaTextlocal({ to, message });
  }
  
  if (provider === 'twilio') {
    return sendViaTwilio({ to, message });
  }
  
  return { success: false, error: 'Invalid SMS provider', provider: 'none' };
}

/**
 * Send SMS notification when order is ready for pickup
 */
export async function sendOrderReadyForPickupSMS(
  customerName: string,
  customerPhone: string,
  orderNumber: string
): Promise<void> {
  const message = `Hi ${customerName}! Your order #${orderNumber} is ready for pickup at Boomiis Restaurant. See you soon!`;
  
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
  const message = `Hi ${customerName}! Your order #${orderNumber} is out for delivery and will arrive in approximately ${estimatedMinutes} minutes.`;
  
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
