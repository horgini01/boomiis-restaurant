-- Manual migration to add missing auth columns to users table
-- Run this on your Railway MySQL database

-- Add auth columns if they don't exist
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `password_hash` varchar(255);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `otp_code` varchar(6);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `otp_expires` timestamp NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `password_reset_token` varchar(255);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `password_reset_expires` timestamp NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_setup_complete` boolean DEFAULT false NOT NULL;

-- Verify columns were added
DESCRIBE users;
