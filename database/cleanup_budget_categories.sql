-- =============================================
-- CLEANUP BUDGET CATEGORIES TRƯỚC KHI TẠO LẠI
-- =============================================

-- 1. Xóa dữ liệu trong các bảng có liên quan (theo thứ tự dependency)
DROP TRIGGER IF EXISTS auto_create_financial_transaction_trigger ON expense_requests;
DROP TRIGGER IF EXISTS update_budget_allocation_spent_trigger ON expense_requests;

DELETE FROM expense_budget_mapping;
DELETE FROM budget_allocations;  
DELETE FROM budget_categories;

-- 2. Xóa functions cũ nếu có
DROP FUNCTION IF EXISTS get_budget_category_tree(INTEGER);
DROP FUNCTION IF EXISTS update_budget_allocation_spent();

-- 3. Xóa bảng và tạo lại để đảm bảo cấu trúc sạch
DROP TABLE IF EXISTS expense_budget_mapping CASCADE;
DROP TABLE IF EXISTS budget_allocations CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;

COMMENT ON SCHEMA public IS 'Cleaned up budget categories tables';
