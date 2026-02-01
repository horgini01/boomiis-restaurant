CREATE TABLE `delivery_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area_name` varchar(100) NOT NULL,
	`postcodes_prefixes` text NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_areas_id` PRIMARY KEY(`id`)
);
