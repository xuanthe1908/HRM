-- Tạo bảng trung gian để quản lý mối quan hệ 1-1 giữa expense_requests và financial_transactions
-- Đảm bảo mỗi expense request chỉ có thể được liên kết với 1 financial transaction

-- Bước 1: Tạo bảng trung gian
CREATE TABLE IF NOT EXISTS expense_financial_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_request_id UUID NOT NULL,
    financial_transaction_id UUID NOT NULL,
    budget_category_id UUID,
    mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mapped_by UUID, -- employee_id của người thực hiện liên kết
    
    -- Ràng buộc unique để đảm bảo 1 expense chỉ liên kết với 1 transaction
    CONSTRAINT unique_expense_mapping UNIQUE (expense_request_id),
    CONSTRAINT unique_transaction_mapping UNIQUE (financial_transaction_id),
    
    -- Foreign key constraints
    CONSTRAINT fk_expense_financial_mapping_expense_request 
        FOREIGN KEY (expense_request_id) 
        REFERENCES expense_requests(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_expense_financial_mapping_financial_transaction 
        FOREIGN KEY (financial_transaction_id) 
        REFERENCES financial_transactions(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_expense_financial_mapping_budget_category 
        FOREIGN KEY (budget_category_id) 
        REFERENCES budget_categories(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_expense_financial_mapping_employee 
        FOREIGN KEY (mapped_by) 
        REFERENCES employees(id) 
        ON DELETE SET NULL
);

-- Bước 2: Tạo index để tối ưu hiệu suất truy vấn
CREATE INDEX IF NOT EXISTS idx_expense_financial_mapping_expense_id 
    ON expense_financial_mapping(expense_request_id);

CREATE INDEX IF NOT EXISTS idx_expense_financial_mapping_transaction_id 
    ON expense_financial_mapping(financial_transaction_id);

CREATE INDEX IF NOT EXISTS idx_expense_financial_mapping_category_id 
    ON expense_financial_mapping(budget_category_id);

-- Bước 3: Tạo function để kiểm tra xem expense đã được liên kết chưa
CREATE OR REPLACE FUNCTION check_expense_already_mapped(expense_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM expense_financial_mapping 
        WHERE expense_request_id = expense_id
    );
END;
$$ LANGUAGE plpgsql;

-- Bước 4: Tạo function để tạo mapping
CREATE OR REPLACE FUNCTION create_expense_financial_mapping(
    p_expense_request_id UUID,
    p_financial_transaction_id UUID,
    p_budget_category_id UUID DEFAULT NULL,
    p_mapped_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    mapping_id UUID;
BEGIN
    -- Kiểm tra xem expense đã được liên kết chưa
    IF check_expense_already_mapped(p_expense_request_id) THEN
        RAISE EXCEPTION 'Expense request % has already been mapped to a financial transaction', p_expense_request_id;
    END IF;
    
    -- Kiểm tra xem transaction đã được liên kết chưa
    IF EXISTS (SELECT 1 FROM expense_financial_mapping WHERE financial_transaction_id = p_financial_transaction_id) THEN
        RAISE EXCEPTION 'Financial transaction % has already been mapped to an expense request', p_financial_transaction_id;
    END IF;
    
    -- Tạo mapping mới
    INSERT INTO expense_financial_mapping (
        expense_request_id, 
        financial_transaction_id, 
        budget_category_id, 
        mapped_by
    ) VALUES (
        p_expense_request_id, 
        p_financial_transaction_id, 
        p_budget_category_id, 
        p_mapped_by
    ) RETURNING id INTO mapping_id;
    
    RETURN mapping_id;
END;
$$ LANGUAGE plpgsql;

-- Bước 5: Tạo function để lấy thông tin mapping
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

-- Bước 6: Tạo view để dễ dàng truy vấn thông tin liên kết
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

-- Bước 7: Thêm comment để giải thích
COMMENT ON TABLE expense_financial_mapping IS 'Bảng trung gian quản lý mối quan hệ 1-1 giữa expense_requests và financial_transactions';
COMMENT ON FUNCTION check_expense_already_mapped(UUID) IS 'Kiểm tra xem expense request đã được liên kết với financial transaction chưa';
COMMENT ON FUNCTION create_expense_financial_mapping(UUID, UUID, UUID, UUID) IS 'Tạo mapping giữa expense request và financial transaction';
COMMENT ON FUNCTION get_expense_financial_mapping(UUID) IS 'Lấy thông tin mapping của một expense request';
