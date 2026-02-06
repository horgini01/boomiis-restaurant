CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_name` varchar(100) NOT NULL,
	`customer_email` varchar(320),
	`content` text NOT NULL,
	`rating` int NOT NULL,
	`is_approved` boolean NOT NULL DEFAULT false,
	`is_featured` boolean NOT NULL DEFAULT false,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
