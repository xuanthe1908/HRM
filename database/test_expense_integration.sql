-- Test script để kiểm tra integration expense với financial
-- Chạy script này trong Supabase SQL Editor

-- 1. Kiểm tra cấu trúc bảng employees
SELECT 'Checking employees table structure:' as test_step;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Kiểm tra dữ liệu mẫu trong employees
SELECT 'Sample employees data:' as test_step;
SELECT id, name, email, employee_code 
FROM employees 
LIMIT 5;

-- 3. Kiểm tra expense_requests có dữ liệu không
SELECT 'Checking expense_requests data:' as test_step;
SELECT 
    COUNT(*) as total_expenses,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM expense_requests;

-- 4. Kiểm tra expense_requests với employee info
SELECT 'Testing expense_requests with employee join:' as test_step;
SELECT 
    er.id,
    er.description,
    er.amount,
    er.status,
    e.name as employee_name,
    e.email as employee_email
FROM expense_requests er
LEFT JOIN employees e ON er.employee_id = e.id
LIMIT 5;

-- 5. Kiểm tra mapping table
SELECT 'Checking expense_financial_mapping:' as test_step;
SELECT 
    COUNT(*) as total_mappings,
    COUNT(DISTINCT expense_request_id) as unique_expenses,
    COUNT(DISTINCT financial_transaction_id) as unique_transactions
FROM expense_financial_mapping;

-- 6. Test function check_expense_already_mapped
SELECT 'Testing check_expense_already_mapped function:' as test_step;
WITH sample_expense AS (
    SELECT id FROM expense_requests LIMIT 1
)
SELECT 
    id as expense_id,
    check_expense_already_mapped(id) as is_already_mapped
FROM sample_expense;

-- 7. Kiểm tra budget categories (chỉ expense categories)
SELECT 'Checking expense budget categories:' as test_step;
SELECT 
    id,
    code,
    name,
    category_type,
    level
FROM budget_categories 
WHERE category_type = 1 
ORDER BY code
LIMIT 10;

-- 8. Kiểm tra financial_transactions
SELECT 'Checking financial_transactions:' as test_step;
SELECT 
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
    COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count
FROM financial_transactions;
