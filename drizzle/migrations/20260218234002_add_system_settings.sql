-- Add system_settings table for feature toggles
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- Insert default settings for reservations and events
INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('reservations_enabled', 'true'),
  ('reservations_closure_message', ''),
  ('events_enabled', 'true'),
  ('events_closure_message', '')
ON DUPLICATE KEY UPDATE setting_key=setting_key;
