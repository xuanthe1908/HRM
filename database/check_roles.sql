-- =============================================
-- KIỂM TRA ROLES TRONG SUPABASE
-- =============================================

-- 1. Kiểm tra enum user_role hiện tại
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- 2. Kiểm tra các giá trị role đang được sử dụng trong bảng employees
SELECT 
    role,
    COUNT(*) as count
FROM employees 
GROUP BY role 
ORDER BY count DESC;

-- 3. Kiểm tra chi tiết employees theo role
SELECT 
    id,
    name,
    email,
    role,
    status,
    created_at
FROM employees 
ORDER BY role, name;

-- 4. Kiểm tra xem có employee nào có role không hợp lệ không
SELECT 
    id,
    name,
    email,
    role,
    status
FROM employees 
WHERE role NOT IN ('admin', 'hr', 'lead', 'accountant', 'employee');

-- 5. Thống kê role theo department
SELECT 
    d.name as department_name,
    e.role,
    COUNT(*) as count
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
GROUP BY d.name, e.role
ORDER BY d.name, e.role;

-- 6. Kiểm tra role của admin users
SELECT 
    e.id,
    e.name,
    e.email,
    e.role,
    e.status
FROM employees e
WHERE e.role = 'admin'
ORDER BY e.name;

-- 7. Kiểm tra role của HR users
SELECT 
    e.id,
    e.name,
    e.email,
    e.role,
    e.status
FROM employees e
WHERE e.role = 'hr'
ORDER BY e.name;

-- 8. Kiểm tra role của manager users
SELECT 
    e.id,
    e.name,
    e.email,
    e.role,
    e.status
FROM employees e
WHERE e.role = 'lead'
ORDER BY e.name;

-- 9. Kiểm tra role của employee users
SELECT 
    e.id,
    e.name,
    e.email,
    e.role,
    e.status
FROM employees e
WHERE e.role = 'employee'
ORDER BY e.name;

-- 10. Tổng hợp thống kê
SELECT 
    'Tổng số nhân viên' as metric,
    COUNT(*) as value
FROM employees
UNION ALL
SELECT 
    'Admin users' as metric,
    COUNT(*) as value
FROM employees WHERE role = 'admin'
UNION ALL
SELECT 
    'HR users' as metric,
    COUNT(*) as value
FROM employees WHERE role = 'hr'
UNION ALL
SELECT 
    'Lead users' as metric,
    COUNT(*) as value
FROM employees WHERE role = 'lead'
UNION ALL
SELECT 
    'Accountant users' as metric,
    COUNT(*) as value
FROM employees WHERE role = 'accountant'
UNION ALL
SELECT 
    'Employee users' as metric,
    COUNT(*) as value
FROM employees WHERE role = 'employee'; 