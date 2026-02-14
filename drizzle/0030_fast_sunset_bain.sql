ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `otp_code` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `otp_expires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `password_reset_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `password_reset_expires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `is_setup_complete` boolean DEFAULT false NOT NULL;