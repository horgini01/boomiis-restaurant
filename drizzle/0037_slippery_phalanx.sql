CREATE TABLE `phone_order_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone_number_hash` varchar(64) NOT NULL,
	`total_orders` int NOT NULL DEFAULT 0,
	`completed_orders` int NOT NULL DEFAULT 0,
	`no_show_count` int NOT NULL DEFAULT 0,
	`last_order_date` timestamp,
	`trust_score` int,
	`is_blocked` boolean NOT NULL DEFAULT false,
	`blocked_reason` text,
	`blocked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phone_order_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `phone_order_history_phone_number_hash_unique` UNIQUE(`phone_number_hash`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_method` enum('stripe','cash_on_pickup','card_on_pickup') DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_received_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_received_by` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `actual_amount_paid` decimal(10,2);--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_notes` text;