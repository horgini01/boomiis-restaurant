ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','owner','manager','kitchen_staff','front_desk') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `invited_by` int;