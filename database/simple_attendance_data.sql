-- Simple attendance data for immediate testing
-- Run this in Supabase SQL Editor

-- First check if you have employees
SELECT id, name, employee_code FROM employees WHERE status = 'active' LIMIT 5;

-- Then manually replace EMPLOYEE_ID_HERE with actual ID from above query
-- Example: '123e4567-e89b-12d3-a456-426614174000'

-- Clear existing data (optional)
-- DELETE FROM attendance_records WHERE employee_id = 'EMPLOYEE_ID_HERE';

-- Insert July 2025 sample data
INSERT INTO attendance_records (employee_id, date, status, check_in_time, check_out_time, working_hours, overtime_hours, notes) VALUES
('EMPLOYEE_ID_HERE', '2025-07-01', 'present', '08:00:00', '17:30:00', 8.5, 0.5, 'Normal day'),
('EMPLOYEE_ID_HERE', '2025-07-02', 'present', '08:15:00', '17:00:00', 7.75, 0, NULL),
('EMPLOYEE_ID_HERE', '2025-07-03', 'late', '08:45:00', '17:15:00', 7.5, 0, 'Traffic jam'),
('EMPLOYEE_ID_HERE', '2025-07-04', 'present', '07:50:00', '18:00:00', 9, 1, 'Extra work'),
('EMPLOYEE_ID_HERE', '2025-07-07', 'present', '08:00:00', '17:00:00', 8, 0, NULL),
('EMPLOYEE_ID_HERE', '2025-07-08', 'leave', NULL, NULL, 0, 0, 'Annual Leave'),
('EMPLOYEE_ID_HERE', '2025-07-09', 'present', '08:10:00', '17:10:00', 8, 0, NULL),
('EMPLOYEE_ID_HERE', '2025-07-10', 'present', '08:00:00', '19:00:00', 10, 2, 'Project deadline'),
('EMPLOYEE_ID_HERE', '2025-07-11', 'absent', NULL, NULL, 0, 0, 'Sick'),
('EMPLOYEE_ID_HERE', '2025-07-14', 'present', '08:00:00', '17:00:00', 8, 0, NULL),
('EMPLOYEE_ID_HERE', '2025-07-15', 'late', '08:30:00', '17:30:00', 8, 0, 'Doctor appointment'),
('EMPLOYEE_ID_HERE', '2025-07-16', 'present', '07:45:00', '17:45:00', 9, 1, NULL),
('EMPLOYEE_ID_HERE', '2025-07-17', 'present', '08:00:00', '17:00:00', 8, 0, NULL),
('EMPLOYEE_ID_HERE', '2025-07-18', 'present', '08:00:00', '17:00:00', 8, 0, NULL);

-- Check the result
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
    COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_days,
    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
    ROUND(SUM(overtime_hours), 1) as total_overtime_hours
FROM attendance_records 
WHERE employee_id = 'EMPLOYEE_ID_HERE'
AND date >= '2025-07-01'; 