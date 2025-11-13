-- Sample attendance data for testing Employee Attendance feature
-- Run this in Supabase SQL Editor to create test data

-- First, let's check if we have employees
-- SELECT id, name, employee_code FROM employees LIMIT 5;

-- Insert sample attendance records for the first employee
-- Replace 'YOUR_EMPLOYEE_ID' with actual employee ID from the employees table

DO $$
DECLARE
    emp_id UUID;
    current_date_loop DATE;
    day_of_week INTEGER;
    status_choice TEXT;
    check_in_time TIME;
    check_out_time TIME;
    working_hours_calc DECIMAL;
    overtime_hours_calc DECIMAL;
BEGIN
    -- Get the first active employee
    SELECT id INTO emp_id FROM employees WHERE status = 'active' LIMIT 1;
    
    IF emp_id IS NULL THEN
        RAISE NOTICE 'No active employees found. Please create an employee first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating attendance records for employee: %', emp_id;
    
    -- Generate attendance data for the last 6 months
    current_date_loop := CURRENT_DATE - INTERVAL '6 months';
    
    WHILE current_date_loop <= CURRENT_DATE LOOP
        day_of_week := EXTRACT(DOW FROM current_date_loop);
        
        -- Skip weekends (0 = Sunday, 6 = Saturday)
        IF day_of_week NOT IN (0, 6) THEN
            -- Randomize attendance status (mostly present)
            CASE 
                WHEN RANDOM() < 0.85 THEN 
                    status_choice := 'present';
                    check_in_time := '08:00:00'::TIME + (RANDOM() * INTERVAL '30 minutes');
                    check_out_time := '17:00:00'::TIME + (RANDOM() * INTERVAL '2 hours');
                    working_hours_calc := EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600;
                    overtime_hours_calc := GREATEST(0, working_hours_calc - 8);
                WHEN RANDOM() < 0.90 THEN
                    status_choice := 'late';
                    check_in_time := '08:30:00'::TIME + (RANDOM() * INTERVAL '1 hour');
                    check_out_time := '17:30:00'::TIME + (RANDOM() * INTERVAL '1 hour');
                    working_hours_calc := EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600;
                    overtime_hours_calc := GREATEST(0, working_hours_calc - 8);
                WHEN RANDOM() < 0.95 THEN
                    status_choice := 'leave';
                    check_in_time := NULL;
                    check_out_time := NULL;
                    working_hours_calc := 0;
                    overtime_hours_calc := 0;
                ELSE
                    status_choice := 'absent';
                    check_in_time := NULL;
                    check_out_time := NULL;
                    working_hours_calc := 0;
                    overtime_hours_calc := 0;
            END CASE;
            
            -- Insert attendance record
            INSERT INTO attendance_records (
                employee_id,
                date,
                status,
                check_in_time,
                check_out_time,
                working_hours,
                overtime_hours,
                notes,
                created_at,
                updated_at
            ) VALUES (
                emp_id,
                current_date_loop,
                status_choice,
                check_in_time,
                check_out_time,
                working_hours_calc,
                overtime_hours_calc,
                CASE 
                    WHEN status_choice = 'leave' AND RANDOM() < 0.5 THEN 'Annual Leave'
                    WHEN status_choice = 'leave' AND RANDOM() < 0.7 THEN 'Sick Leave'
                    WHEN status_choice = 'leave' THEN 'Personal Leave'
                    WHEN status_choice = 'late' THEN 'Traffic jam'
                    WHEN status_choice = 'absent' THEN 'Emergency'
                    ELSE NULL
                END,
                NOW(),
                NOW()
            ) ON CONFLICT (employee_id, date) DO NOTHING;
        END IF;
        
        current_date_loop := current_date_loop + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Sample attendance data created successfully!';
END $$;

-- Verify the data
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
    COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_days,
    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
    ROUND(AVG(working_hours), 2) as avg_working_hours,
    ROUND(SUM(overtime_hours), 2) as total_overtime
FROM attendance_records 
WHERE employee_id = (SELECT id FROM employees WHERE status = 'active' LIMIT 1)
AND date >= CURRENT_DATE - INTERVAL '6 months'; 