-- Add location column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS location varchar(255);
