import { sendSMS } from './sms.service';

/**
 * Send OTP code via SMS for admin setup
 * @param phone - Phone number in E.164 format (e.g., +447911123456)
 * @param otpCode - 6-digit OTP code
 * @param recipientName - Name of the recipient
 * @returns Promise with SMS send result
 */
export async function sendSetupOTPSMS(
  phone: string,
  otpCode: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  const message = `Hi ${recipientName}, your Boomiis Restaurant admin setup verification code is: ${otpCode}. This code expires in 10 minutes.`;
  
  const result = await sendSMS({
    to: phone,
    message,
  });
  
  if (result.success) {
    console.log(`[OTP SMS] Setup OTP sent to ${phone} via ${result.provider}`);
  } else {
    console.error(`[OTP SMS] Failed to send setup OTP: ${result.error}`);
  }
  
  return result;
}

/**
 * Send OTP code via SMS for password reset
 * @param phone - Phone number in E.164 format (e.g., +447911123456)
 * @param otpCode - 6-digit OTP code
 * @param recipientName - Name of the recipient
 * @returns Promise with SMS send result
 */
export async function sendPasswordResetOTPSMS(
  phone: string,
  otpCode: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  const message = `Hi ${recipientName}, your Boomiis Restaurant password reset code is: ${otpCode}. This code expires in 15 minutes. If you didn't request this, please ignore.`;
  
  const result = await sendSMS({
    to: phone,
    message,
  });
  
  if (result.success) {
    console.log(`[OTP SMS] Password reset OTP sent to ${phone} via ${result.provider}`);
  } else {
    console.error(`[OTP SMS] Failed to send password reset OTP: ${result.error}`);
  }
  
  return result;
}

/**
 * Send OTP code via SMS for order verification (pay-on-pickup)
 * @param phone - Phone number in E.164 format (e.g., +447911123456)
 * @param otpCode - 6-digit OTP code
 * @param recipientName - Name of the recipient
 * @returns Promise with SMS send result
 */
export async function sendOrderVerificationOTPSMS(
  phone: string,
  otpCode: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  const message = `Hi ${recipientName}, your Boomiis order verification code is: ${otpCode}. This code expires in 10 minutes.`;
  
  const result = await sendSMS({
    to: phone,
    message,
  });
  
  if (result.success) {
    console.log(`[OTP SMS] Order verification OTP sent to ${phone} via ${result.provider}`);
  } else {
    console.error(`[OTP SMS] Failed to send order verification OTP: ${result.error}`);
  }
  
  return result;
}
