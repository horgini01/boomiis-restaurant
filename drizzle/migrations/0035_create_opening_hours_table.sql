-- Create opening_hours table
CREATE TABLE IF NOT EXISTS `opening_hours` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `day_of_week` int NOT NULL UNIQUE,
  `open_time` varchar(5) NOT NULL,
  `close_time` varchar(5) NOT NULL,
  `is_closed` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
