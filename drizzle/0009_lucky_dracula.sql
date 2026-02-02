CREATE TABLE `sms_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_type` varchar(50) NOT NULL,
	`template_name` varchar(100) NOT NULL,
	`message` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_templates_template_type_unique` UNIQUE(`template_type`)
);
