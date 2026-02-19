ALTER TABLE `otp_tokens` ADD `delivery_method` enum('email','sms') DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `otp_delivery_method` enum('email','sms') DEFAULT 'email';