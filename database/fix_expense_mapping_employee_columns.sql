-- Sửa lỗi tên cột trong expense_financial_mapping
-- Bảng employees sử dụng cột 'name' thay vì 'first_name' và 'last_name'

-- 1. Xóa view cũ nếu tồn tại
DROP VIEW IF EXISTS expense_financial_mapping_view;

-- 2. Tạo lại function get_expense_financial_mapping với tên cột đúng
CREATE OR REPLACE FUNCTION get_expense_financial_mapping(expense_id UUID)
RETURNS TABLE (
    mapping_id UUID,
    financial_transaction_id UUID,
    budget_category_id UUID,
    budget_category_name TEXT,
    budget_category_code TEXT,
    mapped_at TIMESTAMP WITH TIME ZONE,
    mapped_by UUID,
    mapped_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        efm.id as mapping_id,
        efm.financial_transaction_id,
        efm.budget_category_id,
        bc.name as budget_category_name,
        bc.code as budget_category_code,
        efm.mapped_at,
        efm.mapped_by,
        e.name as mapped_by_name
    FROM expense_financial_mapping efm
    LEFT JOIN budget_categories bc ON efm.budget_category_id = bc.id
    LEFT JOIN employees e ON efm.mapped_by = e.id
    WHERE efm.expense_request_id = expense_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Tạo lại view với tên cột đúng
CREATE OR REPLACE VIEW expense_financial_mapping_view AS
SELECT 
    efm.id as mapping_id,
    er.id as expense_request_id,
    er.description as expense_description,
    er.amount as expense_amount,
    er.status as expense_status,
    ft.id as financial_transaction_id,
    ft.description as transaction_description,
    ft.amount as transaction_amount,
    ft.type as transaction_type,
    ft.status as transaction_status,
    bc.id as budget_category_id,
    bc.name as budget_category_name,
    bc.code as budget_category_code,
    efm.mapped_at,
    efm.mapped_by,
    e.name as mapped_by_name
FROM expense_financial_mapping efm
JOIN expense_requests er ON efm.expense_request_id = er.id
JOIN financial_transactions ft ON efm.financial_transaction_id = ft.id
LEFT JOIN budget_categories bc ON efm.budget_category_id = bc.id
LEFT JOIN employees e ON efm.mapped_by = e.id;

-- 4. Kiểm tra cấu trúc bảng employees
SELECT 'Checking employees table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Test function sau khi sửa
SELECT 'Testing get_expense_financial_mapping function:' as info;
-- Lấy một expense request để test (nếu có)
WITH sample_expense AS (
    SELECT id FROM expense_requests LIMIT 1
)
SELECT 
    id as expense_id,
    check_expense_already_mapped(id) as is_already_mapped
FROM sample_expense;
