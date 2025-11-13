-- Add day_of_week column to attendance_records table
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(10);

COMMENT ON COLUMN public.attendance_records.day_of_week IS 'Thứ trong tuần (ví dụ: T.2, T.3, CN)';
