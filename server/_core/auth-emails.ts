import { getResendClient, FROM_EMAIL } from '../email';

/**
 * Email templates for authentication flows
 */

/**
 * Send OTP code for admin setup
 * @param email Admin email address
 * @param otpCode 6-digit OTP code
 * @param adminName Admin name
 */
export async function sendSetupOTPEmail(
  email: string,
  otpCode: string,
  adminName: string
): Promise<void> {
  const subject = 'Complete Your Admin Setup - Verification Code';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Setup Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Complete Your Admin Setup</h1>
        <p>Hello ${adminName},</p>
        <p>Welcome to your restaurant management system! To complete your admin account setup, please use the verification code below:</p>
        
        <div style="background-color: #fff; border: 2px solid #3498db; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f8c8d;">Your Verification Code</p>
          <p style="font-size: 36px; font-weight: bold; color: #2c3e50; letter-spacing: 8px; margin: 0;">${otpCode}</p>
        </div>
        
        <p><strong>This code will expire in 10 minutes.</strong></p>
        
        <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #7f8c8d;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const resend = getResendClient();
  if (!resend) {
    console.error('[Auth Email] Resend client not available');
    throw new Error('Email service not configured');
  }
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });
}

/**
 * Send OTP code for password reset
 * @param email User email address
 * @param otpCode 6-digit OTP code
 * @param userName User name
 */
export async function sendPasswordResetOTPEmail(
  email: string,
  otpCode: string,
  userName: string
): Promise<void> {
  const subject = 'Password Reset Request - Verification Code';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h1>
        <p>Hello ${userName},</p>
        <p>We received a request to reset your password. To proceed, please use the verification code below:</p>
        
        <div style="background-color: #fff; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f8c8d;">Your Verification Code</p>
          <p style="font-size: 36px; font-weight: bold; color: #2c3e50; letter-spacing: 8px; margin: 0;">${otpCode}</p>
        </div>
        
        <p><strong>This code will expire in 10 minutes.</strong></p>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404;">
            <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #7f8c8d;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const resend = getResendClient();
  if (!resend) {
    console.error('[Auth Email] Resend client not available');
    throw new Error('Email service not configured');
  }
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });
}

/**
 * Send password change confirmation email
 * @param email User email address
 * @param userName User name
 */
export async function sendPasswordChangedEmail(
  email: string,
  userName: string
): Promise<void> {
  const subject = 'Password Changed Successfully';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Password Changed Successfully</h1>
        <p>Hello ${userName},</p>
        <p>This is a confirmation that your password has been changed successfully.</p>
        
        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #155724;">
            ✓ Your account is now secured with your new password.
          </p>
        </div>
        
        <p><strong>Date and Time:</strong> ${new Date().toLocaleString('en-GB', { 
          dateStyle: 'full', 
          timeStyle: 'short',
          timeZone: 'Europe/London'
        })}</p>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404;">
            <strong>Security Notice:</strong> If you didn't make this change, please contact support immediately.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #7f8c8d;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const resend = getResendClient();
  if (!resend) {
    console.error('[Auth Email] Resend client not available');
    throw new Error('Email service not configured');
  }
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });
}

/**
 * Send welcome email after admin setup is complete
 * @param email Admin email address
 * @param adminName Admin name
 * @param loginUrl URL to admin login page
 */
export async function sendAdminWelcomeEmail(
  email: string,
  adminName: string,
  loginUrl: string
): Promise<void> {
  const subject = 'Welcome to Your Restaurant Management System';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">🎉 Welcome to Your Restaurant Management System!</h1>
        <p>Hello ${adminName},</p>
        <p>Congratulations! Your admin account has been set up successfully. You now have full access to manage your restaurant operations.</p>
        
        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What You Can Do:</h2>
          <ul style="padding-left: 20px;">
            <li>📋 Manage menu items and categories</li>
            <li>📦 Process and track orders in real-time</li>
            <li>📅 Handle table reservations</li>
            <li>📊 View analytics and reports</li>
            <li>👥 Manage staff users and permissions</li>
            <li>⚙️ Configure restaurant settings</li>
            <li>📧 Customize email templates</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #3498db; color: #fff; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Login to Admin Dashboard
          </a>
        </div>
        
        <div style="background-color: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #2c3e50;">
            <strong>💡 Pro Tip:</strong> Start by updating your restaurant settings (name, logo, contact info) and then add your menu items.
          </p>
        </div>
        
        <p>If you have any questions or need assistance, don't hesitate to reach out to support.</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #7f8c8d;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const resend = getResendClient();
  if (!resend) {
    console.error('[Auth Email] Resend client not available');
    throw new Error('Email service not configured');
  }
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });
}
