-- Test script để kiểm tra chức năng mapping expense với financial transaction

-- 1. Kiểm tra bảng mapping đã được tạo
SELECT 'Checking expense_financial_mapping table...' as test_step;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'expense_financial_mapping'
) as table_exists;

-- 2. Kiểm tra các functions đã được tạo
SELECT 'Checking functions...' as test_step;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'check_expense_already_mapped',
    'create_expense_financial_mapping',
    'get_expense_financial_mapping'
);

-- 3. Kiểm tra view đã được tạo
SELECT 'Checking view...' as test_step;
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'expense_financial_mapping_view';

-- 4. Kiểm tra dữ liệu hiện tại
SELECT 'Current data status:' as test_step;
SELECT 
    'expense_requests' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
FROM expense_requests
UNION ALL
SELECT 
    'financial_transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
FROM financial_transactions
UNION ALL
SELECT 
    'expense_financial_mapping' as table_name,
    COUNT(*) as total_records,
    COUNT(*) as mapped_count
FROM expense_financial_mapping;

-- 5. Kiểm tra ràng buộc unique
SELECT 'Checking unique constraints...' as test_step;
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'expense_financial_mapping' 
AND constraint_type = 'UNIQUE';

-- 6. Test function check_expense_already_mapped với dữ liệu mẫu
SELECT 'Testing check_expense_already_mapped function...' as test_step;
-- Lấy một expense request để test
WITH sample_expense AS (
    SELECT id FROM expense_requests LIMIT 1
)
SELECT 
    id as expense_id,
    check_expense_already_mapped(id) as is_already_mapped
FROM sample_expense;

-- 7. Hiển thị thông tin mapping hiện tại (nếu có)
SELECT 'Current mappings:' as test_step;
SELECT 
    er.description as expense_description,
    er.amount as expense_amount,
    er.status as expense_status,
    ft.description as transaction_description,
    ft.amount as transaction_amount,
    ft.status as transaction_status,
    bc.name as budget_category_name,
    bc.code as budget_category_code,
    efm.mapped_at,
    e.name as mapped_by_name
FROM expense_financial_mapping efm
JOIN expense_requests er ON efm.expense_request_id = er.id
JOIN financial_transactions ft ON efm.financial_transaction_id = ft.id
LEFT JOIN budget_categories bc ON efm.budget_category_id = bc.id
LEFT JOIN employees e ON efm.mapped_by = e.id
LIMIT 5;

-- 8. Kiểm tra performance với index
SELECT 'Checking indexes...' as test_step;
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'expense_financial_mapping';
