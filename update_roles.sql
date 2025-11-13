-- =============================================
-- CẬP NHẬT ROLES TRONG SUPABASE
-- =============================================

-- 1. Cập nhật role từ 'manager' thành 'lead' (nếu có)
UPDATE employees 
SET role = 'lead' 
WHERE role = 'manager';

-- 2. Cập nhật role từ 'employee' thành 'accountant' (nếu cần)
UPDATE employees 
SET role = 'accountant' 
WHERE role = 'employee' AND name LIKE '%accountant%';

-- 3. Đảm bảo tất cả employees có role hợp lệ
UPDATE employees 
SET role = 'employee' 
WHERE role NOT IN ('admin', 'hr', 'lead', 'accountant', 'employee');

-- 4. Kiểm tra lại sau khi cập nhật
SELECT 
    role,
    COUNT(*) as count
FROM employees 
GROUP BY role 
ORDER BY count DESC;

-- 5. Hiển thị các thay đổi
SELECT 
    'Các role hiện tại:' as info,
    role,
    COUNT(*) as count
FROM employees 
GROUP BY role 
ORDER BY role; 