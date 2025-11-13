-- Test script để kiểm tra logic mapping UI
-- Chạy script này trong Supabase SQL Editor

-- 1. Kiểm tra expense requests với mapping status
SELECT 'Testing expense requests with mapping status:' as test_step;
SELECT 
    er.id,
    er.description,
    er.amount,
    er.status,
    e.name as employee_name,
    CASE 
        WHEN efm.expense_request_id IS NOT NULL THEN true 
        ELSE false 
    END as is_mapped,
    efm.mapped_at,
    bc.name as budget_category_name,
    bc.code as budget_category_code
FROM expense_requests er
LEFT JOIN employees e ON er.employee_id = e.id
LEFT JOIN expense_financial_mapping efm ON er.id = efm.expense_request_id
LEFT JOIN budget_categories bc ON efm.budget_category_id = bc.id
ORDER BY er.created_at DESC
LIMIT 10;

-- 2. Kiểm tra approved expenses chưa được mapped
SELECT 'Approved expenses NOT mapped yet:' as test_step;
SELECT 
    er.id,
    er.description,
    er.amount,
    e.name as employee_name,
    er.created_at
FROM expense_requests er
LEFT JOIN employees e ON er.employee_id = e.id
LEFT JOIN expense_financial_mapping efm ON er.id = efm.expense_request_id
WHERE er.status = 'approved' 
AND efm.expense_request_id IS NULL
ORDER BY er.created_at DESC;

-- 3. Kiểm tra approved expenses đã được mapped
SELECT 'Approved expenses ALREADY mapped:' as test_step;
SELECT 
    er.id,
    er.description,
    er.amount,
    e.name as employee_name,
    efm.mapped_at,
    bc.name as budget_category_name,
    bc.code as budget_category_code
FROM expense_requests er
LEFT JOIN employees e ON er.employee_id = e.id
INNER JOIN expense_financial_mapping efm ON er.id = efm.expense_request_id
LEFT JOIN budget_categories bc ON efm.budget_category_id = bc.id
WHERE er.status = 'approved'
ORDER BY efm.mapped_at DESC;

-- 4. Test function get_expense_financial_mapping với dữ liệu thực
SELECT 'Testing get_expense_financial_mapping function:' as test_step;
WITH sample_mapped_expense AS (
    SELECT er.id 
    FROM expense_requests er
    INNER JOIN expense_financial_mapping efm ON er.id = efm.expense_request_id
    LIMIT 1
)
SELECT 
    id as expense_id,
    get_expense_financial_mapping(id) as mapping_info
FROM sample_mapped_expense;

-- 5. Kiểm tra tổng quan mapping
SELECT 'Mapping overview:' as test_step;
SELECT 
    'Total expense requests' as metric,
    COUNT(*) as count
FROM expense_requests
UNION ALL
SELECT 
    'Approved expense requests' as metric,
    COUNT(*) as count
FROM expense_requests
WHERE status = 'approved'
UNION ALL
SELECT 
    'Mapped expense requests' as metric,
    COUNT(*) as count
FROM expense_financial_mapping
UNION ALL
SELECT 
    'Approved but NOT mapped' as metric,
    COUNT(*) as count
FROM expense_requests er
LEFT JOIN expense_financial_mapping efm ON er.id = efm.expense_request_id
WHERE er.status = 'approved' 
AND efm.expense_request_id IS NULL;
