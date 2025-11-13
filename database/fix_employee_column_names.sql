-- Kiểm tra cấu trúc bảng employees
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Kiểm tra dữ liệu mẫu trong bảng employees
SELECT id, name, employee_code 
FROM employees 
LIMIT 5;
