-- =============================================
-- SCRIPT CHẠY ĐỂ THIẾT LẬP HỆ THỐNG NGÂN SÁCH
-- =============================================

-- Bước 1: Cleanup (nếu đã chạy trước đó)
\echo 'Bước 1: Cleanup dữ liệu cũ...'
\i cleanup_budget_categories.sql

-- Bước 2: Tạo cấu trúc mới
\echo 'Bước 2: Tạo cấu trúc danh mục ngân sách...'
\i create_hierarchical_budget_categories_fixed.sql

-- Bước 3: Thêm trường reference cho financial transactions
\echo 'Bước 3: Cập nhật bảng financial_transactions...'
\i add_financial_transactions_reference.sql

-- Bước 4: Hiển thị kết quả
\echo 'Hoàn thành! Kiểm tra kết quả:'
SELECT 'Tổng số danh mục đã tạo:' as info, COUNT(*) as count FROM budget_categories;
SELECT 'Danh mục cấp 1:' as info, COUNT(*) as count FROM budget_categories WHERE level = 1;
SELECT 'Danh mục cấp 2:' as info, COUNT(*) as count FROM budget_categories WHERE level = 2;
SELECT 'Danh mục cấp 3:' as info, COUNT(*) as count FROM budget_categories WHERE level = 3;

\echo 'Chi tiết các danh mục chính:'
SELECT code, name, category_type, level FROM budget_categories WHERE level = 1 ORDER BY sort_order;
