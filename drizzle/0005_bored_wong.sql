CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_type` varchar(50) NOT NULL,
	`recipient_email` varchar(320) NOT NULL,
	`recipient_name` varchar(200),
	`subject` varchar(200) NOT NULL,
	`status` enum('sent','delivered','opened','clicked','bounced','failed') NOT NULL DEFAULT 'sent',
	`resend_id` varchar(100),
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`delivered_at` timestamp,
	`opened_at` timestamp,
	`clicked_at` timestamp,
	`bounced_at` timestamp,
	`error_message` text,
	`metadata` text,
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_type` varchar(50) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`body_html` text NOT NULL,
	`header_color` varchar(7) NOT NULL DEFAULT '#d4a574',
	`footer_text` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_template_type_unique` UNIQUE(`template_type`)
);
