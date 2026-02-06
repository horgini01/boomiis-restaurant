ALTER TABLE `delivery_areas` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `delivery_areas` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `delivery_areas` ADD `radius_meters` int DEFAULT 3000;