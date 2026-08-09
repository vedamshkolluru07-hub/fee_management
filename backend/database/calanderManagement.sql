CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS calendar (
  event_id SERIAL PRIMARY KEY,
  academic_year_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(30) DEFAULT 'user',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  is_all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(255),
  color VARCHAR(50),
  reminder_schedule JSONB DEFAULT '{}'::JSONB,
  notify_before_minutes INT DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  is_postponed BOOLEAN DEFAULT FALSE,
  postponed_from TIMESTAMP,
  is_done BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  notified_at TIMESTAMP,
  created_by UUID REFERENCES Users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time IS NULL OR end_time >= start_time),

  CONSTRAINT fk_classes_academic_year
    FOREIGN KEY (academic_year_id)
    REFERENCES academic_years(academic_year_id)
    ON DELETE CASCADE

);

CREATE INDEX IF NOT EXISTS idx_calendar_start_time ON calendar(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_event_type ON calendar(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_is_done ON calendar(is_done);
CREATE INDEX IF NOT EXISTS idx_calendar_admin_only ON calendar(is_admin_only);
CREATE INDEX IF NOT EXISTS idx_calendar_notified_at ON calendar(notified_at);
