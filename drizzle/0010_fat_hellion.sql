CREATE TABLE `opening_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`day_of_week` int NOT NULL,
	`open_time` varchar(5) NOT NULL,
	`close_time` varchar(5) NOT NULL,
	`is_closed` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opening_hours_id` PRIMARY KEY(`id`)
);
