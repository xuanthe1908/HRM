-- =============================================
-- SCRIPT HOÀN CHỈNH THIẾT LẬP HỆ THỐNG NGÂN SÁCH
-- (Khắc phục mọi lỗi có thể xảy ra)
-- =============================================

\echo 'Bước 1: Xóa các trigger và function cũ...'
-- 1. Xóa các trigger cũ
DROP TRIGGER IF EXISTS update_budget_categories_updated_at ON budget_categories;
DROP TRIGGER IF EXISTS update_budget_allocations_updated_at ON budget_allocations;
DROP TRIGGER IF EXISTS update_budget_allocation_spent_trigger ON expense_requests;
DROP TRIGGER IF EXISTS auto_create_financial_transaction_trigger ON expense_requests;

-- 2. Xóa function cũ
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_budget_category_tree(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_budget_allocation_spent() CASCADE;
DROP FUNCTION IF EXISTS auto_create_financial_transaction_for_expense() CASCADE;

\echo 'Bước 2: Xóa dữ liệu cũ trong bảng...'
-- 3. Xóa dữ liệu cũ
DELETE FROM expense_budget_mapping WHERE 1=1;
DELETE FROM budget_allocations WHERE 1=1;
DELETE FROM budget_categories WHERE 1=1;

\echo 'Bước 3: Xóa và tạo lại bảng để đảm bảo cấu trúc sạch...'
-- 4. Drop và recreate tables
DROP TABLE IF EXISTS expense_budget_mapping CASCADE;
DROP TABLE IF EXISTS budget_allocations CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;

-- 5. Tạo lại từ đầu
-- Bảng danh mục ngân sách
CREATE TABLE budget_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1,
    category_type INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_category_type CHECK (category_type IN (1, 2)),
    CONSTRAINT valid_level CHECK (level > 0 AND level <= 10)
);

-- Bảng phân bổ ngân sách
CREATE TABLE budget_allocations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID NOT NULL,
    category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(budget_id, category_id)
);

-- Bảng mapping expense và budget
CREATE TABLE expense_budget_mapping (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    expense_request_id UUID NOT NULL,
    budget_category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

\echo 'Bước 4: Chèn dữ liệu mẫu...'
-- 6. Chèn dữ liệu mẫu (với mã không trùng lặp)
INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
('100000', 'Chi phí bán hàng/cung cấp dịch vụ', NULL, 1, 1, 'Tổng chi phí bán hàng và cung cấp dịch vụ', 10),
('101000', 'Chi phí tổ chức sự kiện truyền thông', NULL, 1, 1, 'Chi phí tổ chức các hoạt động truyền thông', 20),
('102000', 'Chi phí quản lý doanh nghiệp', NULL, 1, 1, 'Chi phí quản lý và điều hành doanh nghiệp', 30),
('103000', 'Chi phí lương, thưởng, hoa hồng, phúc lợi', NULL, 1, 1, 'Tổng chi phí nhân sự', 40),
('104000', 'Chi phí tài sản cố định', NULL, 1, 1, 'Chi phí liên quan đến tài sản cố định', 50),
('200000', 'Doanh thu', NULL, 1, 2, 'Tổng doanh thu của công ty', 100);

-- Chèn danh mục con
DO $$
DECLARE
    cat_100000_id UUID;
    cat_101000_id UUID;
    cat_102000_id UUID;
    cat_103000_id UUID;
    cat_104000_id UUID;
    cat_200000_id UUID;
BEGIN
    -- Lấy ID của các danh mục cha
    SELECT id INTO cat_100000_id FROM budget_categories WHERE code = '100000';
    SELECT id INTO cat_101000_id FROM budget_categories WHERE code = '101000';
    SELECT id INTO cat_102000_id FROM budget_categories WHERE code = '102000';
    SELECT id INTO cat_103000_id FROM budget_categories WHERE code = '103000';
    SELECT id INTO cat_104000_id FROM budget_categories WHERE code = '104000';
    SELECT id INTO cat_200000_id FROM budget_categories WHERE code = '200000';

    -- CHI PHÍ BÁN HÀNG (100000)
    INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
    ('10000001', 'Chi phí dùng cụ bán hàng/CCDV', cat_100000_id, 2, 1, 'Chi phí công cụ dụng cụ bán hàng', 1),
    ('10000002', 'Chi phí nhân sự quản lý', cat_100000_id, 2, 1, 'Chi phí nhân sự quản lý bán hàng', 2),
    ('10000003', 'Chi phí dịch vụ ngoài', cat_100000_id, 2, 1, 'Chi phí thuê dịch vụ bên ngoài', 3),
    ('10000004', 'Chi phí khẩu hao TSCĐ', cat_100000_id, 2, 1, 'Chi phí khấu hao tài sản cố định', 4),
    ('10000005', 'Chi phí vệ sinh/sửa chữa phục vụ bán hàng', cat_100000_id, 2, 1, 'Chi phí vệ sinh và sửa chữa', 5),
    ('10000006', 'Chi phí điện, nước, internet', cat_100000_id, 2, 1, 'Chi phí điện, nước, internet', 6),
    ('10000007', 'Chi phí bằng tiền phục vụ bán hàng khác', cat_100000_id, 2, 1, 'Các chi phí khác', 7),
    ('10000008', 'Chi phí marketing/quảng cáo', cat_100000_id, 2, 1, 'Chi phí marketing và quảng cáo', 8);

    -- CHI PHÍ TỔ CHỨC SỰ KIỆN (101000)
    INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
    ('10100001', 'Chi phí tổ chức sự kiện truyền thông', cat_101000_id, 2, 1, 'Chi phí tổ chức các sự kiện', 1),
    ('10100002', 'Chi phí lương cơ bản', cat_101000_id, 2, 1, 'Chi phí lương cơ bản nhân viên', 2),
    ('10100003', 'Chi phí lương làm thêm giờ', cat_101000_id, 2, 1, 'Chi phí lương tăng ca', 3),
    ('10100004', 'Chi phí thưởng', cat_101000_id, 2, 1, 'Chi phí thưởng nhân viên', 4),
    ('10100005', 'Chi phí thưởng nóng', cat_101000_id, 2, 1, 'Chi phí thưởng đột xuất', 5),
    ('10100006', 'Chi phí thưởng KPI', cat_101000_id, 2, 1, 'Chi phí thưởng theo KPI', 6),
    ('10100007', 'Chi phí đào tạo nội bộ', cat_101000_id, 2, 1, 'Chi phí đào tạo nhân viên', 7),
    ('10100008', 'Chi phí phúc lợi', cat_101000_id, 2, 1, 'Chi phí phúc lợi nhân viên', 8),
    ('10100009', 'Chi phí mua pantry', cat_101000_id, 2, 1, 'Chi phí mua đồ ăn uống pantry', 9),
    ('10100010', 'Chi phí teambuilding, liên hoan', cat_101000_id, 2, 1, 'Chi phí team building', 10),
    ('10100011', 'Chi phí hoa hồng CTV, Freelancer', cat_101000_id, 2, 1, 'Chi phí hoa hồng cộng tác viên', 11);

    -- CHI PHÍ QUẢN LÝ (102000)
    INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
    ('10200001', 'Chi phí dụng cụ phục vụ quản lý', cat_102000_id, 2, 1, 'Chi phí dụng cụ quản lý', 1),
    ('10200002', 'Chi phí nhân sự quản lý', cat_102000_id, 2, 1, 'Chi phí nhân sự quản lý', 2),
    ('10200003', 'Chi phí văn phòng phẩm', cat_102000_id, 2, 1, 'Chi phí văn phòng phẩm', 3),
    ('10200004', 'Chi phí khấu hao', cat_102000_id, 2, 1, 'Chi phí khấu hao tài sản', 4),
    ('10200005', 'Chi phí mua văn phòng phẩm', cat_102000_id, 2, 1, 'Chi phí mua sắm văn phòng phẩm', 5),
    ('10200006', 'Chi phí dịch vụ thuê ngoài', cat_102000_id, 2, 1, 'Chi phí dịch vụ thuê ngoài', 6),
    ('10200007', 'Chi phí vệ sinh/sửa chữa quản lý', cat_102000_id, 2, 1, 'Chi phí vệ sinh sửa chữa', 7),
    ('10200008', 'Chi phí quản lý khác', cat_102000_id, 2, 1, 'Các chi phí quản lý khác', 8);

    -- CHI PHÍ LƯƠNG THƯỞNG (103000)
    INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
    ('10300001', 'Chi phí lương', cat_103000_id, 2, 1, 'Chi phí lương nhân viên', 1),
    ('10300002', 'Chi phí thưởng', cat_103000_id, 2, 1, 'Chi phí thưởng', 2),
    ('10300003', 'Chi phí phúc lợi', cat_103000_id, 2, 1, 'Chi phí phúc lợi', 3);

    -- CHI PHÍ TÀI SẢN CỐ ĐỊNH (104000)
    INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
    ('10400001', 'Chi phí khấu hao tài sản', cat_104000_id, 2, 1, 'Chi phí khấu hao TSCĐ', 1),
    ('10400002', 'Chi phí sửa chữa tài sản', cat_104000_id, 2, 1, 'Chi phí bảo trì, sửa chữa TSCĐ', 2),
    ('10400003', 'Chi phí mua sắm tài sản', cat_104000_id, 2, 1, 'Chi phí mua TSCĐ mới', 3),
    ('10400004', 'Chi phí thanh lý tài sản', cat_104000_id, 2, 1, 'Chi phí thanh lý TSCĐ', 4);

    -- DOANH THU (200000)
    INSERT INTO budget_categories (code, name, parent_id, level, category_type, description, sort_order) VALUES
    ('20000001', 'Doanh thu dịch vụ chính', cat_200000_id, 2, 2, 'Doanh thu từ dịch vụ chính', 1),
    ('20000002', 'Doanh thu dịch vụ phụ', cat_200000_id, 2, 2, 'Doanh thu từ dịch vụ phụ', 2),
    ('20000003', 'Doanh thu khác', cat_200000_id, 2, 2, 'Các khoản doanh thu khác', 3),
    ('20000004', 'Doanh thu từ đầu tư', cat_200000_id, 2, 2, 'Lãi từ hoạt động đầu tư', 4);

END $$;

\echo 'Bước 5: Tạo indexes...'
-- 7. Tạo indexes
CREATE INDEX IF NOT EXISTS idx_budget_categories_parent_id ON budget_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_level ON budget_categories(level);
CREATE INDEX IF NOT EXISTS idx_budget_categories_type ON budget_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_budget_categories_code ON budget_categories(code);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget_id ON budget_allocations(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_category_id ON budget_allocations(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_budget_mapping_expense_id ON expense_budget_mapping(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_budget_mapping_category_id ON expense_budget_mapping(budget_category_id);

\echo 'Bước 6: Tạo functions và triggers...'
-- 8. Tạo function update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Tạo triggers
CREATE TRIGGER update_budget_categories_updated_at 
    BEFORE UPDATE ON budget_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_allocations_updated_at 
    BEFORE UPDATE ON budget_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Tạo function lấy cây danh mục
CREATE OR REPLACE FUNCTION get_budget_category_tree(category_type_filter INTEGER DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    name VARCHAR(255),
    parent_id UUID,
    level INTEGER,
    category_type INTEGER,
    description TEXT,
    is_active BOOLEAN,
    sort_order INTEGER,
    path TEXT,
    full_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT 
            bc.id,
            bc.code,
            bc.name,
            bc.parent_id,
            bc.level,
            bc.category_type,
            bc.description,
            bc.is_active,
            bc.sort_order,
            bc.code::TEXT as path,
            bc.name::TEXT as full_name
        FROM budget_categories bc
        WHERE bc.parent_id IS NULL
        AND (category_type_filter IS NULL OR bc.category_type = category_type_filter)
        AND bc.is_active = TRUE
        
        UNION ALL
        
        -- Child categories
        SELECT 
            bc.id,
            bc.code,
            bc.name,
            bc.parent_id,
            bc.level,
            bc.category_type,
            bc.description,
            bc.is_active,
            bc.sort_order,
            (ct.path || '/' || bc.code)::TEXT as path,
            (ct.full_name || ' / ' || bc.name)::TEXT as full_name
        FROM budget_categories bc
        INNER JOIN category_tree ct ON bc.parent_id = ct.id
        WHERE bc.is_active = TRUE
        AND (category_type_filter IS NULL OR bc.category_type = category_type_filter)
    )
    SELECT * FROM category_tree
    ORDER BY category_type, sort_order, level, code;
END;
$$ LANGUAGE plpgsql;

\echo 'Hoàn thành! Kiểm tra kết quả:'
-- 11. Hiển thị kết quả
SELECT 'Tổng số danh mục đã tạo:' as info, COUNT(*) as count FROM budget_categories;
SELECT 'Danh mục cấp 1 (chính):' as info, COUNT(*) as count FROM budget_categories WHERE level = 1;
SELECT 'Danh mục cấp 2 (con):' as info, COUNT(*) as count FROM budget_categories WHERE level = 2;

\echo 'Danh sách danh mục chính:'
SELECT code, name, category_type, 
       CASE category_type WHEN 1 THEN 'Chi phí' WHEN 2 THEN 'Doanh thu' END as type_name
FROM budget_categories 
WHERE level = 1 
ORDER BY sort_order;

\echo 'Setup hoàn tất! Hệ thống ngân sách đã sẵn sàng.';
