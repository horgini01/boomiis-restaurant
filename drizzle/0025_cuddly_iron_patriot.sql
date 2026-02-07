CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`user_name` varchar(255),
	`user_role` varchar(50),
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(100) NOT NULL,
	`entity_id` varchar(100),
	`entity_name` varchar(255),
	`changes` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
