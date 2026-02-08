ALTER TABLE `orders` ADD `review_request_sent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `review_request_sent_at` timestamp;