-- Drop the old function first to allow changing the return type
DROP FUNCTION IF EXISTS get_attendance_summary(integer, integer);

-- Function to get attendance summary for a given month and year
CREATE OR REPLACE FUNCTION get_attendance_summary(p_month integer, p_year integer)
RETURNS TABLE(
    employee_id uuid,
    employee_code text,
    employee_name text,
    total_work_days numeric,
    total_overtime_days numeric,
    total_paid_leave numeric,
    total_unpaid_leave numeric,
    total_overtime_hours numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id as employee_id,
        e.employee_code::text, -- Explicitly cast to text
        e.name::text as employee_name, -- Explicitly cast to text
        -- Tổng công bình thường (chỉ tính present_full, present_half)
        COALESCE(SUM(CASE 
            WHEN ar.status IN ('present_full', 'present_half') THEN ar.work_value 
            ELSE 0 
        END), 0)::numeric as total_work_days,
        -- Tổng công tăng ca/làm thêm (overtime, weekend_overtime)
        COALESCE(SUM(CASE 
            WHEN ar.status IN ('overtime', 'weekend_overtime') THEN ar.work_value 
            ELSE 0 
        END), 0)::numeric as total_overtime_days,
        -- Tổng nghỉ phép có lương
        COALESCE(SUM(CASE WHEN ar.status = 'paid_leave' THEN 1 ELSE 0 END), 0)::numeric as total_paid_leave,
        -- Tổng nghỉ không lương
        COALESCE(SUM(CASE WHEN ar.status = 'unpaid_leave' THEN 1 ELSE 0 END), 0)::numeric as total_unpaid_leave,
        -- Tổng giờ tăng ca
        COALESCE(SUM(ar.overtime_hours), 0)::numeric as total_overtime_hours
    FROM
        employees e
    LEFT JOIN
        attendance_records ar ON e.id = ar.employee_id
        AND EXTRACT(MONTH FROM ar.date) = p_month
        AND EXTRACT(YEAR FROM ar.date) = p_year
    GROUP BY
        e.id, e.employee_code, e.name
    ORDER BY
        e.name;
END;
$$ LANGUAGE plpgsql;