-- =============================================
-- THÊM TRƯỜNG REFERENCE CHO FINANCIAL TRANSACTIONS
-- =============================================

-- 1. Thêm các cột reference để liên kết với expense requests
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- 2. Tạo index cho hiệu suất
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference 
ON financial_transactions(reference_type, reference_id);

-- 3. Thêm comment
COMMENT ON COLUMN financial_transactions.reference_type IS 'Loại tham chiếu (expense_request, manual, etc.)';
COMMENT ON COLUMN financial_transactions.reference_id IS 'ID của bản ghi được tham chiếu';

-- 4. Tạo function để tự động tạo financial transaction khi expense được approve
CREATE OR REPLACE FUNCTION auto_create_financial_transaction_for_expense()
RETURNS TRIGGER AS $$
DECLARE
    employee_record RECORD;
BEGIN
    -- Chỉ xử lý khi status thay đổi thành 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Lấy thông tin nhân viên
        SELECT * INTO employee_record 
        FROM employees 
        WHERE id = NEW.employee_id;
        
        -- Tạo financial transaction
        INSERT INTO financial_transactions (
            type,
            category_id,
            description,
            amount,
            date,
            account_type,
            status,
            notes,
            created_by,
            reference_type,
            reference_id
        ) VALUES (
            'expense',
            NULL, -- Sẽ mapping với budget category thay vì financial category cũ
            'Chi phí từ yêu cầu: ' || NEW.description,
            NEW.amount,
            NEW.date,
            'company',
            'approved',
            'Tự động tạo từ yêu cầu chi phí #' || NEW.id || ' của ' || COALESCE(employee_record.name, 'Unknown'),
            NEW.approved_by,
            'expense_request',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Tạo trigger để tự động tạo financial transaction
DROP TRIGGER IF EXISTS auto_create_financial_transaction_trigger ON expense_requests;
CREATE TRIGGER auto_create_financial_transaction_trigger
    AFTER UPDATE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION auto_create_financial_transaction_for_expense();

-- 6. Cập nhật RLS policies nếu cần
-- (Giả sử các RLS policies hiện tại đã đủ)

COMMENT ON FUNCTION auto_create_financial_transaction_for_expense() IS 'Tự động tạo financial transaction khi expense request được approve';
