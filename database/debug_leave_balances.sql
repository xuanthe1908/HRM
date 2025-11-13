-- =============================================
-- DEBUG LEAVE BALANCES
-- =============================================
-- Script để kiểm tra và debug dữ liệu leave_balances

-- 1. Kiểm tra năm hiện tại
SELECT 
  EXTRACT(YEAR FROM CURRENT_DATE) as current_year,
  CURRENT_DATE as current_date;

-- 2. Kiểm tra tất cả records trong leave_balances
SELECT 
  lb.id,
  e.name as employee_name,
  lb.year,
  lb.annual_leave_total,
  lb.annual_leave_used,
  (lb.annual_leave_total - lb.annual_leave_used) as annual_remaining,
  lb.sick_leave_total,
  lb.sick_leave_used,
  lb.personal_leave_total,
  lb.personal_leave_used,
  lb.maternity_leave_total,
  lb.maternity_leave_used,
  lb.created_at,
  lb.updated_at
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
ORDER BY lb.year DESC, e.name;

-- 3. Kiểm tra số lượng records theo năm
SELECT 
  year,
  COUNT(*) as record_count
FROM leave_balances
GROUP BY year
ORDER BY year DESC;

-- 4. Kiểm tra nhân viên chưa có leave_balances
SELECT 
  e.id,
  e.name,
  e.official_start_date,
  e.status
FROM employees e
WHERE e.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM leave_balances lb 
  WHERE lb.employee_id = e.id 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- 5. Kiểm tra tính toán annual_leave_total
SELECT 
  e.name,
  e.official_start_date,
  lb.year,
  lb.annual_leave_total,
  lb.annual_leave_used,
  (lb.annual_leave_total - lb.annual_leave_used) as remaining,
  EXTRACT(YEAR FROM age(CURRENT_DATE, e.official_start_date)) * 12 + 
  EXTRACT(MONTH FROM age(CURRENT_DATE, e.official_start_date)) as calculated_months
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE e.status = 'active'
ORDER BY e.name;

-- 6. Test function update_annual_leave_total
-- SELECT update_annual_leave_total('employee_id_here', EXTRACT(YEAR FROM CURRENT_DATE));

-- =============================================
-- Kết thúc script
-- ============================================= 