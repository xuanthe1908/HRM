-- Migration: Add auth_user_id field to employees table
-- Run this in Supabase SQL Editor

-- Add auth_user_id column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on auth_user_id (one employee per auth user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_auth_user_id 
ON public.employees(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Update existing employees to link with auth users if possible
-- (This is optional - for existing data)
-- You might need to manually link existing employees to auth users

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position; 