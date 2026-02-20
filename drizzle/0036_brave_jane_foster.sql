CREATE TABLE `about_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section_key` varchar(50) NOT NULL,
	`section_value` text NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `about_content_id` PRIMARY KEY(`id`),
	CONSTRAINT `about_content_section_key_unique` UNIQUE(`section_key`)
);
--> statement-breakpoint
CREATE TABLE `about_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(50) NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `about_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `awards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`image_url` text,
	`year` int,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `awards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`slug` varchar(300) NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`featured_image` text,
	`author_id` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
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
CREATE TABLE `delivery_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area_name` varchar(100) NOT NULL,
	`postcodes_prefixes` text NOT NULL,
	`delivery_fee` decimal(10,2) NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`radius_meters` int DEFAULT 3000,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_name` varchar(200) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`body_html` text NOT NULL,
	`status` enum('draft','scheduled','sending','sent','failed') NOT NULL DEFAULT 'draft',
	`recipient_count` int NOT NULL DEFAULT 0,
	`sent_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`scheduled_for` timestamp,
	`sent_at` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `event_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_name` varchar(200) NOT NULL,
	`customer_email` varchar(320) NOT NULL,
	`customer_phone` varchar(50) NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`venue_address` text NOT NULL,
	`event_date` timestamp,
	`guest_count` int,
	`budget` varchar(100),
	`message` text NOT NULL,
	`status` enum('new','contacted','quoted','booked','cancelled') NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gallery_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200),
	`description` text,
	`image_url` text NOT NULL,
	`thumbnail_url` text,
	`category` varchar(100),
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_type` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`is_published` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `legal_pages_page_type_unique` UNIQUE(`page_type`)
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`image_url` text,
	`is_vegan` boolean NOT NULL DEFAULT false,
	`is_gluten_free` boolean NOT NULL DEFAULT false,
	`is_halal` boolean NOT NULL DEFAULT false,
	`allergens` text,
	`is_available` boolean NOT NULL DEFAULT true,
	`out_of_stock` boolean NOT NULL DEFAULT false,
	`is_featured` boolean NOT NULL DEFAULT false,
	`is_chef_special` boolean NOT NULL DEFAULT false,
	`prep_time_minutes` int NOT NULL DEFAULT 15,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_items_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `migrations_run` (
	`id` int AUTO_INCREMENT NOT NULL,
	`migration_name` varchar(255) NOT NULL,
	`run_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `migrations_run_id` PRIMARY KEY(`id`),
	CONSTRAINT `migrations_run_migration_name_unique` UNIQUE(`migration_name`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`menu_item_id` int NOT NULL,
	`menu_item_name` varchar(200) NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`customer_name` varchar(200) NOT NULL,
	`customer_email` varchar(320) NOT NULL,
	`customer_phone` varchar(50) NOT NULL,
	`order_type` enum('delivery','pickup') NOT NULL,
	`delivery_address` text,
	`delivery_postcode` varchar(20),
	`scheduled_for` timestamp,
	`subtotal` decimal(10,2) NOT NULL,
	`delivery_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total` decimal(10,2) NOT NULL,
	`status` enum('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled','delayed') NOT NULL DEFAULT 'pending',
	`payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`payment_intent_id` varchar(255),
	`special_instructions` text,
	`sms_opt_in` boolean NOT NULL DEFAULT true,
	`review_request_sent` boolean NOT NULL DEFAULT false,
	`review_request_sent_at` timestamp,
	`timeline` text,
	`last_updated_by` int,
	`last_updated_by_name` varchar(200),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`),
	CONSTRAINT `orders_payment_intent_id_unique` UNIQUE(`payment_intent_id`)
);
--> statement-breakpoint
CREATE TABLE `otp_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(6) NOT NULL,
	`delivery_method` enum('email','sms') NOT NULL DEFAULT 'email',
	`expires_at` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_name` varchar(200) NOT NULL,
	`customer_email` varchar(320) NOT NULL,
	`customer_phone` varchar(50) NOT NULL,
	`party_size` int NOT NULL,
	`reservation_date` timestamp NOT NULL,
	`reservation_time` varchar(10) NOT NULL,
	`special_requests` text,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`route` varchar(200) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text NOT NULL,
	`setting_type` varchar(50) NOT NULL DEFAULT 'text',
	`description` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_setting_key_unique` UNIQUE(`setting_key`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200),
	`source` enum('homepage','checkout','admin') NOT NULL DEFAULT 'homepage',
	`is_active` boolean NOT NULL DEFAULT true,
	`subscribed_at` timestamp NOT NULL DEFAULT (now()),
	`unsubscribed_at` timestamp,
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_setting_key_unique` UNIQUE(`setting_key`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`title` varchar(200) NOT NULL,
	`bio` text NOT NULL,
	`image_url` text,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonial_response_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonial_response_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_name` varchar(100) NOT NULL,
	`customer_email` varchar(320),
	`content` text NOT NULL,
	`rating` int NOT NULL,
	`is_approved` boolean NOT NULL DEFAULT false,
	`is_featured` boolean NOT NULL DEFAULT false,
	`display_order` int NOT NULL DEFAULT 0,
	`admin_response` text,
	`admin_response_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`password` varchar(255),
	`password_hash` varchar(255),
	`otp_code` varchar(6),
	`otp_expires` timestamp,
	`otp_delivery_method` enum('email','sms') DEFAULT 'email',
	`password_reset_token` varchar(255),
	`password_reset_expires` timestamp,
	`is_setup_complete` boolean NOT NULL DEFAULT false,
	`role` enum('user','admin','owner','manager','kitchen_staff','front_desk') NOT NULL DEFAULT 'user',
	`custom_role_id` int,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`phone` varchar(20),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`invited_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
