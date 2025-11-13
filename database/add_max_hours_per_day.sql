-- Migration: Add max_hours_per_day to salary_regulations table
-- This field will limit the maximum hours that can be counted per day for overtime calculation

ALTER TABLE salary_regulations 
ADD COLUMN max_hours_per_day INTEGER DEFAULT 8;

-- Add comment to explain the field
COMMENT ON COLUMN salary_regulations.max_hours_per_day IS 'Maximum hours that can be counted per day for overtime calculation (default: 8 hours)';

-- Update existing records to have the default value
UPDATE salary_regulations 
SET max_hours_per_day = 8 
WHERE max_hours_per_day IS NULL; 