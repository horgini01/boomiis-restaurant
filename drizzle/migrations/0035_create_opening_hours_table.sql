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

-- Insert default opening hours for all 7 days (IGNORE duplicates)
INSERT IGNORE INTO `opening_hours` (`day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
(0, '10:00', '21:00', true),
(1, '01:00', '22:00', false),
(2, '00:30', '22:00', false),
(3, '10:00', '22:00', false),
(4, '10:00', '22:00', false),
(5, '10:00', '23:00', false),
(6, '10:00', '23:00', false);
