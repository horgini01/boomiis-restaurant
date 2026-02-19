-- Add delivery_method column to users table for admin setup OTP tracking
ALTER TABLE users ADD COLUMN otp_delivery_method ENUM('email', 'sms') DEFAULT 'email' AFTER otpExpires;

-- Add delivery_method column to otp_tokens table for password reset OTP tracking
ALTER TABLE otp_tokens ADD COLUMN delivery_method ENUM('email', 'sms') DEFAULT 'email' AFTER code;
