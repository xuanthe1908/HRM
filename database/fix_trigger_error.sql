-- =============================================
-- KHẮC PHỤC LỖI TRIGGER ĐÃ TỒN TẠI
-- =============================================

-- 1. Xóa các trigger cũ (nếu có)
DROP TRIGGER IF EXISTS update_budget_categories_updated_at ON budget_categories;
DROP TRIGGER IF EXISTS update_budget_allocations_updated_at ON budget_allocations;
DROP TRIGGER IF EXISTS update_budget_allocation_spent_trigger ON expense_requests;
DROP TRIGGER IF EXISTS auto_create_financial_transaction_trigger ON expense_requests;

-- 2. Xóa function cũ (nếu có)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_budget_category_tree(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_budget_allocation_spent() CASCADE;
DROP FUNCTION IF EXISTS auto_create_financial_transaction_for_expense() CASCADE;

-- 3. Hiển thị thông báo
SELECT 'Đã xóa các trigger và function cũ. Bây giờ bạn có thể chạy lại file create_hierarchical_budget_categories_fixed.sql' as message;
