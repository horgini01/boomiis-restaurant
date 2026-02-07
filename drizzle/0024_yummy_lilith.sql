CREATE TABLE `sms_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_type` varchar(50) NOT NULL,
	`recipient_phone` varchar(50) NOT NULL,
	`recipient_name` varchar(200),
	`message` text NOT NULL,
	`status` enum('sent','delivered','failed','pending') NOT NULL DEFAULT 'pending',
	`provider` enum('bulksms','textlocal') NOT NULL,
	`provider_id` varchar(100),
	`message_length` int NOT NULL,
	`segment_count` int NOT NULL DEFAULT 1,
	`cost_gbp` decimal(10,4) DEFAULT '0.0000',
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`delivered_at` timestamp,
	`failed_at` timestamp,
	`error_message` text,
	`metadata` text,
	CONSTRAINT `sms_logs_id` PRIMARY KEY(`id`)
);
