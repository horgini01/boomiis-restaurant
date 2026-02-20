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

-- Insert default opening hours for all 7 days (only if table is empty)
INSERT INTO `opening_hours` (`day_of_week`, `open_time`, `close_time`, `is_closed`)
SELECT * FROM (
  SELECT 0 as day_of_week, '10:00' as open_time, '21:00' as close_time, true as is_closed UNION ALL
  SELECT 1, '01:00', '22:00', false UNION ALL
  SELECT 2, '00:30', '22:00', false UNION ALL
  SELECT 3, '10:00', '22:00', false UNION ALL
  SELECT 4, '10:00', '22:00', false UNION ALL
  SELECT 5, '10:00', '23:00', false UNION ALL
  SELECT 6, '10:00', '23:00', false
) AS temp
WHERE NOT EXISTS (SELECT 1 FROM `opening_hours` LIMIT 1);
