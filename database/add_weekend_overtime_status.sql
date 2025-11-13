-- Add 'weekend_overtime' to the attendance_status enum
-- This allows marking attendance records for overtime work on weekends.

ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'weekend_overtime';
