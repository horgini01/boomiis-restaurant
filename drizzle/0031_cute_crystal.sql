CREATE TABLE `migrations_run` (
	`id` int AUTO_INCREMENT NOT NULL,
	`migration_name` varchar(255) NOT NULL,
	`run_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `migrations_run_id` PRIMARY KEY(`id`),
	CONSTRAINT `migrations_run_migration_name_unique` UNIQUE(`migration_name`)
);
