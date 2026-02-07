CREATE TABLE `custom_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_name` varchar(100) NOT NULL,
	`role_slug` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_roles_role_name_unique` UNIQUE(`role_name`),
	CONSTRAINT `custom_roles_role_slug_unique` UNIQUE(`role_slug`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`route` varchar(200) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
