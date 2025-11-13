-- =============================================
-- UPDATE LEAVE BALANCES TO 2025
-- =============================================
-- Cập nhật dữ liệu leave_balances từ năm 2024 sang 2025

-- 1. Tạo leave_balances records cho năm 2025
DO $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Lặp qua tất cả nhân viên
  FOR emp_record IN 
    SELECT id FROM employees WHERE status = 'active'
  LOOP
    -- Tạo leave_balances cho năm 2025 nếu chưa có
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
      2025,
      12, -- annual_leave_total mặc định
      0,  -- annual_leave_used
      0,  -- sick_leave_total (chưa có quy chế)
      0,  -- sick_leave_used
      0,  -- personal_leave_total (chưa có quy chế)
      0,  -- personal_leave_used
      0,  -- maternity_leave_total (chưa có quy chế)
      0   -- maternity_leave_used
    )
    ON CONFLICT (employee_id, year) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Đã tạo leave_balances cho năm 2025 cho % nhân viên', (SELECT COUNT(*) FROM employees WHERE status = 'active');
END $$;

-- 2. Cập nhật annual_leave_total cho năm 2025 dựa trên thời gian làm việc
DO $$
DECLARE
  emp_record RECORD;
BEGIN
  FOR emp_record IN 
    SELECT id FROM employees WHERE status = 'active'
  LOOP
    PERFORM update_annual_leave_total(emp_record.id, 2025);
  END LOOP;
  
  RAISE NOTICE 'Đã cập nhật annual_leave_total cho năm 2025 cho tất cả nhân viên';
END $$;

-- 3. Kiểm tra dữ liệu
SELECT 
  e.name,
  lb.year,
  lb.annual_leave_total,
  lb.annual_leave_used,
  (lb.annual_leave_total - lb.annual_leave_used) as annual_remaining
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
WHERE lb.year = 2025
ORDER BY e.name;

-- 4. Xóa dữ liệu cũ năm 2024 (tùy chọn)
-- DELETE FROM leave_balances WHERE year = 2024;

-- =============================================
-- Kết thúc script
-- ============================================= 