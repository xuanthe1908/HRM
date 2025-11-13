-- Migration: Add enable_progressive_tax to salary_regulations table
-- This field will control whether to use progressive tax calculation or flat 10% rate

ALTER TABLE salary_regulations 
ADD COLUMN enable_progressive_tax BOOLEAN DEFAULT TRUE;

-- Add comment to explain the field
COMMENT ON COLUMN salary_regulations.enable_progressive_tax IS 'Enable progressive tax calculation (TRUE) or use flat 10% rate (FALSE)';

-- Update existing records to have the default value
UPDATE salary_regulations 
SET enable_progressive_tax = TRUE 
WHERE enable_progressive_tax IS NULL; 