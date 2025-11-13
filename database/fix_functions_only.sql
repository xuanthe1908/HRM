-- Fix employee balance functions only - resolve column name conflicts
-- Chạy file này trên Supabase để sửa lỗi "column reference current_balance is ambiguous"
-- File này chỉ cập nhật các function, không tạo lại tables/policies

-- 1. Sửa function update_employee_balance_on_expense_approval
CREATE OR REPLACE FUNCTION update_employee_balance_on_expense_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Chỉ xử lý khi status thay đổi thành 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Đảm bảo có balance record cho nhân viên
        INSERT INTO employee_balances (employee_id, current_balance, total_received, total_spent)
        VALUES (NEW.employee_id, 0, 0, 0)
        ON CONFLICT (employee_id) DO NOTHING;
        
        -- Lấy số dư hiện tại
        SELECT COALESCE(eb.current_balance, 0) INTO v_current_balance
        FROM employee_balances eb
        WHERE eb.employee_id = NEW.employee_id;
        
        -- Tính số dư mới (trừ đi số tiền expense)
        v_new_balance := v_current_balance - NEW.amount;
        
        -- Cập nhật số dư
        UPDATE employee_balances 
        SET 
            current_balance = v_new_balance,
            total_spent = total_spent + NEW.amount,
            updated_at = NOW()
        WHERE employee_id = NEW.employee_id;
        
        -- Tạo transaction record
        INSERT INTO employee_balance_transactions (
            employee_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            reference_id,
            reference_type,
            description,
            created_by
        ) VALUES (
            NEW.employee_id,
            'expense_approved',
            -NEW.amount,
            v_current_balance,
            v_new_balance,
            NEW.id,
            'expense_request',
            'Chi phí được duyệt: ' || NEW.description,
            NEW.approved_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Sửa function adjust_employee_balance
CREATE OR REPLACE FUNCTION adjust_employee_balance(
    p_employee_id UUID,
    p_amount DECIMAL(15,2),
    p_description TEXT,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Đảm bảo có balance record cho nhân viên
    INSERT INTO employee_balances (employee_id, current_balance, total_received, total_spent)
    VALUES (p_employee_id, 0, 0, 0)
    ON CONFLICT (employee_id) DO NOTHING;
    
    -- Lấy số dư hiện tại
    SELECT COALESCE(eb.current_balance, 0) INTO v_current_balance
    FROM employee_balances eb
    WHERE eb.employee_id = p_employee_id;
    
    -- Tính số dư mới
    v_new_balance := v_current_balance + p_amount;
    
    -- Cập nhật số dư
    UPDATE employee_balances 
    SET 
        current_balance = v_new_balance,
        total_received = total_received + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
        total_spent = total_spent + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
        updated_at = NOW()
    WHERE employee_id = p_employee_id;
    
    -- Tạo transaction record
    INSERT INTO employee_balance_transactions (
        employee_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_type,
        description,
        notes,
        created_by
    ) VALUES (
        p_employee_id,
        'balance_adjustment',
        p_amount,
        v_current_balance,
        v_new_balance,
        'balance_adjustment',
        p_description,
        p_notes,
        p_created_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. Sửa function monthly_balance_settlement
CREATE OR REPLACE FUNCTION monthly_balance_settlement(
    p_employee_id UUID,
    p_settlement_amount DECIMAL(15,2),
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Đảm bảo có balance record cho nhân viên
    INSERT INTO employee_balances (employee_id, current_balance, total_received, total_spent)
    VALUES (p_employee_id, 0, 0, 0)
    ON CONFLICT (employee_id) DO NOTHING;
    
    -- Lấy số dư hiện tại
    SELECT COALESCE(eb.current_balance, 0) INTO v_current_balance
    FROM employee_balances eb
    WHERE eb.employee_id = p_employee_id;
    
    -- Tính số dư mới (cộng thêm số tiền thanh toán)
    v_new_balance := v_current_balance + p_settlement_amount;
    
    -- Cập nhật số dư
    UPDATE employee_balances 
    SET 
        current_balance = v_new_balance,
        total_received = total_received + p_settlement_amount,
        updated_at = NOW()
    WHERE employee_id = p_employee_id;
    
    -- Tạo transaction record
    INSERT INTO employee_balance_transactions (
        employee_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_type,
        description,
        notes,
        created_by
    ) VALUES (
        p_employee_id,
        'monthly_settlement',
        p_settlement_amount,
        v_current_balance,
        v_new_balance,
        'monthly_settlement',
        'Thanh toán cuối tháng',
        p_notes,
        p_created_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Thông báo hoàn thành
SELECT 'Employee balance functions have been fixed successfully!' as status;
