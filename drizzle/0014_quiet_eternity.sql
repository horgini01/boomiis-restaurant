CREATE TABLE `menu_item_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menu_item_id` int NOT NULL,
	`customer_name` varchar(100) NOT NULL,
	`customer_email` varchar(320),
	`rating` int NOT NULL,
	`comment` text,
	`is_approved` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_item_reviews_id` PRIMARY KEY(`id`)
);
