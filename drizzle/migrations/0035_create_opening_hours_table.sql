-- Create opening_hours table
CREATE TABLE IF NOT EXISTS `opening_hours` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `day_of_week` int NOT NULL,
  `open_time` varchar(5) NOT NULL,
  `close_time` varchar(5) NOT NULL,
  `is_closed` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default opening hours for all 7 days
INSERT INTO `opening_hours` (`day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
(0, '10:00', '21:00', true),  -- Sunday: Closed
(1, '01:00', '22:00', false), -- Monday: 1:00 AM - 10:00 PM
(2, '00:30', '22:00', false), -- Tuesday: 12:30 AM - 10:00 PM
(3, '10:00', '22:00', false), -- Wednesday: 10:00 AM - 10:00 PM
(4, '10:00', '22:00', false), -- Thursday: 10:00 AM - 10:00 PM
(5, '10:00', '23:00', false), -- Friday: 10:00 AM - 11:00 PM
(6, '10:00', '23:00', false); -- Saturday: 10:00 AM - 11:00 PM
