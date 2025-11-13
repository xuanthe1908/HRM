-- Migration: Cập nhật logic lưu phụ cấp từ thông tin nhân viên
-- Đảm bảo các phụ cấp từ thông tin nhân viên được lưu đúng cách

-- Thêm comment cho các trường phụ cấp trong bảng payroll_records
COMMENT ON COLUMN payroll_records.meal_allowance IS 'Phụ cấp ăn trưa từ thông tin nhân viên';
COMMENT ON COLUMN payroll_records.transport_allowance IS 'Phụ cấp đi lại từ thông tin nhân viên';
COMMENT ON COLUMN payroll_records.phone_allowance IS 'Phụ cấp điện thoại từ thông tin nhân viên';
COMMENT ON COLUMN payroll_records.attendance_allowance IS 'Phụ cấp chuyên cần từ thông tin nhân viên';

-- Tạo index cho các trường phụ cấp thường được tìm kiếm
CREATE INDEX IF NOT EXISTS idx_payroll_meal_allowance ON payroll_records(meal_allowance);
CREATE INDEX IF NOT EXISTS idx_payroll_transport_allowance ON payroll_records(transport_allowance);
CREATE INDEX IF NOT EXISTS idx_payroll_phone_allowance ON payroll_records(phone_allowance);
CREATE INDEX IF NOT EXISTS idx_payroll_attendance_allowance ON payroll_records(attendance_allowance);

-- Tạo view để xem tổng hợp phụ cấp
CREATE OR REPLACE VIEW payroll_allowances_summary AS
SELECT 
    pr.employee_id,
    pr.month,
    pr.year,
    e.name as employee_name,
    pr.working_days,
    pr.actual_working_days,
    ROUND((pr.actual_working_days / pr.working_days) * 100, 2) as attendance_rate,
    pr.meal_allowance,
    pr.transport_allowance,
    pr.phone_allowance,
    pr.attendance_allowance,
    pr.total_allowances,
    (pr.meal_allowance + pr.transport_allowance + pr.phone_allowance + pr.attendance_allowance) as employee_allowances_total,
    (pr.total_allowances - (pr.meal_allowance + pr.transport_allowance + pr.phone_allowance + pr.attendance_allowance)) as additional_allowances
FROM payroll_records pr
JOIN employees e ON pr.employee_id = e.id
ORDER BY pr.year DESC, pr.month DESC, e.name;

-- Tạo function để tính tổng phụ cấp từ thông tin nhân viên (theo tỷ lệ ngày công)
CREATE OR REPLACE FUNCTION calculate_employee_allowances_with_attendance(emp_id UUID, present_days DECIMAL, working_days INTEGER)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_allowances DECIMAL(15,2) := 0;
    attendance_ratio DECIMAL(5,4) := 0;
BEGIN
    -- Tính tỷ lệ ngày công
    IF working_days > 0 THEN
        attendance_ratio := present_days / working_days;
    END IF;
    
    -- Tính phụ cấp theo tỷ lệ ngày công
    SELECT (COALESCE(meal_allowance, 0) + COALESCE(transport_allowance, 0) + 
            COALESCE(phone_allowance, 0) + COALESCE(attendance_allowance, 0)) * attendance_ratio
    INTO total_allowances
    FROM employees
    WHERE id = emp_id;
    
    RETURN total_allowances;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật total_allowances khi có thay đổi phụ cấp
CREATE OR REPLACE FUNCTION update_total_allowances()
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật total_allowances bao gồm cả phụ cấp từ thông tin nhân viên (đã điều chỉnh) và phụ cấp bổ sung
    NEW.total_allowances = COALESCE(NEW.meal_allowance, 0) + 
                          COALESCE(NEW.transport_allowance, 0) + 
                          COALESCE(NEW.phone_allowance, 0) + 
                          COALESCE(NEW.attendance_allowance, 0) +
                          COALESCE(NEW.housing_allowance, 0) +
                          COALESCE(NEW.position_allowance, 0) +
                          COALESCE(NEW.other_allowances, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
DROP TRIGGER IF EXISTS trigger_update_total_allowances ON payroll_records;
CREATE TRIGGER trigger_update_total_allowances
    BEFORE INSERT OR UPDATE ON payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION update_total_allowances(); 