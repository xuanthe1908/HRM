-- =============================================
-- FIX LEAVE BALANCES 2025 WITH CORRECT LOGIC
-- =============================================
-- Cập nhật leave_balances với logic đúng và xử lý múi giờ

-- 1. Tạo function để tính toán chính xác
CREATE OR REPLACE FUNCTION calculate_annual_leave_total(
  emp_official_start_date DATE,
  check_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
  months_worked INTEGER;
  annual_total NUMERIC;
BEGIN
  -- Nếu chưa có ngày bắt đầu chính thức
  IF emp_official_start_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Nếu ngày hiện tại < ngày bắt đầu
  IF check_date < emp_official_start_date THEN
    RETURN 0;
  END IF;

  -- Tính số tháng đã làm việc
  months_worked := (EXTRACT(YEAR FROM age(check_date, emp_official_start_date)) * 12) + 
                   EXTRACT(MONTH FROM age(check_date, emp_official_start_date));

  -- Logic tính toán:
  -- Nếu bắt đầu ngày 1: có ngay 1 ngày
  -- Nếu bắt đầu giữa tháng: chờ đến tháng tiếp theo
  IF EXTRACT(DAY FROM emp_official_start_date) = 1 THEN
    -- Bắt đầu ngày 1: tính từ tháng bắt đầu
    annual_total := months_worked;
  ELSE
    -- Bắt đầu giữa tháng: tính từ tháng tiếp theo
    IF months_worked > 0 THEN
      annual_total := months_worked - 1;
    ELSE
      annual_total := 0;
    END IF;
  END IF;

  -- Tối đa 12 ngày/năm
  RETURN LEAST(annual_total, 12);
END;
$$ LANGUAGE plpgsql;

-- 2. Cập nhật tất cả leave_balances cho năm 2025
DO $$
DECLARE
  emp_record RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  calculated_total NUMERIC;
BEGIN
  FOR emp_record IN 
    SELECT id, official_start_date FROM employees WHERE status = 'active'
  LOOP
    -- Tính toán annual_leave_total
    calculated_total := calculate_annual_leave_total(
      emp_record.official_start_date, 
      CURRENT_DATE
    );

    -- Cập nhật hoặc tạo mới leave_balances
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
      emp_record.id,
      current_year,
      calculated_total,
      0, -- annual_leave_used
      0, -- sick_leave_total
      0, -- sick_leave_used
      0, -- personal_leave_total
      0, -- personal_leave_used
      0, -- maternity_leave_total
      0  -- maternity_leave_used
    )
    ON CONFLICT (employee_id, year) 
    DO UPDATE SET 
      annual_leave_total = EXCLUDED.annual_leave_total,
      updated_at = CURRENT_TIMESTAMP;
  END LOOP;
  
  RAISE NOTICE 'Đã cập nhật leave_balances cho năm % cho tất cả nhân viên', current_year;
END $$;

-- 3. Kiểm tra kết quả
SELECT 
  e.name,
  e.official_start_date,
  lb.year,
  lb.annual_leave_total,
  lb.annual_leave_used,
  (lb.annual_leave_total - lb.annual_leave_used) as remaining,
  calculate_annual_leave_total(e.official_start_date) as calculated_total
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.name;

-- 4. Test tính toán ngày earning tiếp theo
DO $$
DECLARE
  test_date DATE := '2024-11-11';
  current_date DATE := CURRENT_DATE;
  next_earning_date DATE;
BEGIN
  -- Tính ngày earning tiếp theo (ngày 1 tháng sau)
  next_earning_date := (current_date + INTERVAL '1 month')::DATE;
  next_earning_date := next_earning_date - (EXTRACT(DAY FROM next_earning_date) - 1)::INTEGER;
  
  RAISE NOTICE 'Test Date: %', test_date;
  RAISE NOTICE 'Current Date: %', current_date;
  RAISE NOTICE 'Next Earning Date: %', next_earning_date;
END $$;

-- =============================================
-- Kết thúc script
-- =============================================
