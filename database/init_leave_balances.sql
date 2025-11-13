-- =============================================
-- INIT LEAVE BALANCES
-- =============================================
-- Khởi tạo dữ liệu cho bảng leave_balances cho tất cả nhân viên

-- Tạo function để khởi tạo leave_balances cho nhân viên
CREATE OR REPLACE FUNCTION init_employee_leave_balances(emp_id UUID, year_val INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Kiểm tra xem record đã tồn tại chưa
  IF NOT EXISTS (
    SELECT 1 FROM leave_balances 
    WHERE employee_id = emp_id AND year = year_val
  ) THEN
    -- Tạo record mới với giá trị mặc định
    INSERT INTO leave_balances (
      employee_id,
      year,
      annual_leave_total,
      annual_leave_used,
      sick_leave_total,
      sick_leave_used,
      personal_leave_total,
      personal_leave_used,
      maternity_leave_total,
      maternity_leave_used
    ) VALUES (
      emp_id,
      year_val,
      12, -- annual_leave_total mặc định
      0,  -- annual_leave_used
      0,  -- sick_leave_total (chưa có quy chế)
      0,  -- sick_leave_used
      0,  -- personal_leave_total (chưa có quy chế)
      0,  -- personal_leave_used
      0,  -- maternity_leave_total (chưa có quy chế)
      0   -- maternity_leave_used
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Khởi tạo leave_balances cho tất cả nhân viên hiện tại
DO $$
DECLARE
  emp_record RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Lặp qua tất cả nhân viên
  FOR emp_record IN 
    SELECT id FROM employees WHERE status = 'active'
  LOOP
    -- Khởi tạo leave_balances cho năm hiện tại (2025)
    PERFORM init_employee_leave_balances(emp_record.id, current_year);
    
    -- Khởi tạo cho năm trước (2024) nếu cần
    PERFORM init_employee_leave_balances(emp_record.id, current_year - 1);
  END LOOP;
  
  RAISE NOTICE 'Đã khởi tạo leave_balances cho năm % cho % nhân viên', current_year, (SELECT COUNT(*) FROM employees WHERE status = 'active');
END $$;

-- Tạo trigger để tự động tạo leave_balances khi có nhân viên mới
CREATE OR REPLACE FUNCTION auto_create_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Tạo leave_balances cho năm hiện tại khi có nhân viên mới
  PERFORM init_employee_leave_balances(NEW.id, EXTRACT(YEAR FROM CURRENT_DATE));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
DROP TRIGGER IF EXISTS auto_create_leave_balances_trigger ON employees;
CREATE TRIGGER auto_create_leave_balances_trigger
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_leave_balances();

-- Function để cập nhật annual_leave_total dựa trên thời gian làm việc
CREATE OR REPLACE FUNCTION update_annual_leave_total(emp_id UUID, year_val INTEGER)
RETURNS VOID AS $$
DECLARE
  emp_official_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_worked INTEGER;
  annual_total NUMERIC;
BEGIN
  -- Lấy ngày bắt đầu chính thức
  SELECT official_start_date INTO emp_official_start_date
  FROM employees WHERE id = emp_id;
  
  -- Nếu chưa có ngày bắt đầu chính thức
  IF emp_official_start_date IS NULL THEN
    annual_total := 0;
  ELSE
    -- Tính số tháng đã làm việc sử dụng age() function
    months_worked := (EXTRACT(YEAR FROM age(current_date, emp_official_start_date)) * 12) + 
                     EXTRACT(MONTH FROM age(current_date, emp_official_start_date));
    
    -- Tính số ngày phép (tối đa 12 ngày/năm)
    annual_total := LEAST(months_worked, 12);
  END IF;
  
  -- Cập nhật leave_balances
  UPDATE leave_balances 
  SET annual_leave_total = annual_total
  WHERE employee_id = emp_id AND year = year_val;
END;
$$ LANGUAGE plpgsql;

-- Cập nhật annual_leave_total cho tất cả nhân viên
DO $$
DECLARE
  emp_record RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  FOR emp_record IN 
    SELECT id FROM employees WHERE status = 'active'
  LOOP
    PERFORM update_annual_leave_total(emp_record.id, current_year);
  END LOOP;
  
  RAISE NOTICE 'Đã cập nhật annual_leave_total cho tất cả nhân viên';
END $$;

-- COMMENTS
COMMENT ON FUNCTION init_employee_leave_balances(UUID, INTEGER) IS 'Khởi tạo leave_balances cho nhân viên';
COMMENT ON FUNCTION auto_create_leave_balances() IS 'Tự động tạo leave_balances khi có nhân viên mới';
COMMENT ON FUNCTION update_annual_leave_total(UUID, INTEGER) IS 'Cập nhật annual_leave_total dựa trên thời gian làm việc';

-- =============================================
-- Kết thúc script
-- ============================================= 