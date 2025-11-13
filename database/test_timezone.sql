-- =============================================
-- TEST TIMEZONE AND DATE CALCULATION
-- =============================================
-- Script để test múi giờ và logic tính toán ngày

-- 1. Kiểm tra múi giờ hiện tại
SELECT 
  CURRENT_TIMESTAMP as current_timestamp,
  CURRENT_DATE as current_date,
  EXTRACT(YEAR FROM CURRENT_DATE) as current_year,
  EXTRACT(MONTH FROM CURRENT_DATE) as current_month,
  EXTRACT(DAY FROM CURRENT_DATE) as current_day;

-- 2. Test logic tính toán ngày earning tiếp theo
DO $$
DECLARE
  test_start_date DATE := '2024-11-11';
  current_date DATE := CURRENT_DATE;
  next_earning_date DATE;
  months_worked INTEGER;
BEGIN
  -- Tính số tháng đã làm việc
  months_worked := (EXTRACT(YEAR FROM age(current_date, test_start_date)) * 12) + 
                   EXTRACT(MONTH FROM age(current_date, test_start_date));
  
  -- Tính ngày earning tiếp theo (ngày 1 tháng sau)
  next_earning_date := (current_date + INTERVAL '1 month')::DATE;
  next_earning_date := next_earning_date - (EXTRACT(DAY FROM next_earning_date) - 1)::INTEGER;
  
  RAISE NOTICE 'Test Date: %', test_start_date;
  RAISE NOTICE 'Current Date: %', current_date;
  RAISE NOTICE 'Months Worked: %', months_worked;
  RAISE NOTICE 'Next Earning Date: %', next_earning_date;
END $$;

-- 3. Test với múi giờ Việt Nam
SELECT 
  '2024-11-11'::DATE as official_start_date,
  CURRENT_DATE as current_date,
  (EXTRACT(YEAR FROM age(CURRENT_DATE, '2024-11-11'::DATE)) * 12) + 
  EXTRACT(MONTH FROM age(CURRENT_DATE, '2024-11-11'::DATE)) as months_worked,
  ((CURRENT_DATE + INTERVAL '1 month')::DATE - 
   (EXTRACT(DAY FROM (CURRENT_DATE + INTERVAL '1 month')::DATE) - 1)::INTEGER) as next_earning_date_vn;

-- 4. Kiểm tra dữ liệu leave_balances hiện tại
SELECT 
  e.name,
  e.official_start_date,
  lb.year,
  lb.annual_leave_total,
  lb.annual_leave_used,
  (lb.annual_leave_total - lb.annual_leave_used) as remaining,
  lb.created_at,
  lb.updated_at
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.name;

-- 5. Test function update_annual_leave_total
-- SELECT update_annual_leave_total('employee_id_here', EXTRACT(YEAR FROM CURRENT_DATE));

-- =============================================
-- Kết thúc script
-- =============================================
