-- Migration: Fix employees manager foreign key constraint
-- Run this in Supabase SQL Editor

-- First, check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
LEFT JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'public.employees'::regclass;

-- Drop existing foreign key constraint if exists (to recreate properly)
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_manager_id_fkey;

-- Add the proper foreign key constraint for manager_id (self-reference)
ALTER TABLE public.employees 
ADD CONSTRAINT employees_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES public.employees(id) 
ON DELETE SET NULL;

-- Add constraint for department_id if not exists
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_department_id_fkey;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_department_id_fkey 
FOREIGN KEY (department_id) REFERENCES public.departments(id) 
ON DELETE SET NULL;

-- Add constraint for position_id if not exists
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_position_id_fkey;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_position_id_fkey 
FOREIGN KEY (position_id) REFERENCES public.positions(id) 
ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);

-- Verify all constraints are now properly created
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
LEFT JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'public.employees'::regclass
AND c.contype = 'f'; -- Only foreign key constraints 