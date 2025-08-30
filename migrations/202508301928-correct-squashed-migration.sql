-- Squashed migration file
-- Generated on 2025-08-30 19:28:00
-- This file represents the final state after all migrations
-- Mock tables (mock_google_events, mock_line_users) were dropped in later migrations

-- Core application tables
CREATE TABLE IF NOT EXISTS coaches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  google_calendar_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone),
  UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  line_user_id VARCHAR(100),
  total_classes INTEGER DEFAULT 0,
  remaining_classes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone),
  UNIQUE(line_user_id)
);

-- Class records with event_id from Google Calendar
CREATE TABLE IF NOT EXISTS class_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  coach_id INTEGER REFERENCES coaches(id),
  class_date TIMESTAMP NOT NULL,
  attended BOOLEAN DEFAULT NULL,
  event_id VARCHAR(255),  -- Added later for Google Calendar integration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id)  -- Each Google Calendar event can only have one class record
);

-- Notification tracking for Google Calendar events
CREATE TABLE IF NOT EXISTS notification_status (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  has_notify BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id)  -- One notification record per event
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_notification_status_event_id ON notification_status(event_id);
CREATE INDEX IF NOT EXISTS idx_notification_status_has_notify ON notification_status(has_notify);
CREATE INDEX IF NOT EXISTS idx_class_records_event_id ON class_records(event_id);