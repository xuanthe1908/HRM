-- =============================================
-- EMPLOYEE BALANCE MANAGEMENT SYSTEM
-- =============================================

-- 1. Tạo bảng employee_balances để lưu số dư nhân viên
CREATE TABLE IF NOT EXISTS employee_balances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    current_balance DECIMAL(15,2) DEFAULT 0,
    total_received DECIMAL(15,2) DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id)
);

-- 2. Tạo bảng employee_balance_transactions để lưu lịch sử giao dịch
CREATE TABLE IF NOT EXISTS employee_balance_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('expense_approved', 'balance_adjustment', 'monthly_settlement')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_id UUID, -- ID của expense_request hoặc null cho adjustment
    reference_type VARCHAR(50), -- 'expense_request', 'balance_adjustment'
    description TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_employee_balances_employee_id ON employee_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_balance_transactions_employee_id ON employee_balance_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_balance_transactions_created_at ON employee_balance_transactions(created_at);

-- 4. Tạo function để tự động tạo employee_balance khi có nhân viên mới
CREATE OR REPLACE FUNCTION create_employee_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO employee_balances (employee_id, current_balance, total_received, total_spent)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (employee_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Tạo trigger để tự động tạo balance cho nhân viên mới
DROP TRIGGER IF EXISTS trigger_create_employee_balance ON employees;
CREATE TRIGGER trigger_create_employee_balance
    AFTER INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION create_employee_balance();

-- 6. Tạo function để cập nhật số dư khi expense request được approve
CREATE OR REPLACE FUNCTION update_employee_balance_on_expense_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Chỉ xử lý khi status thay đổi thành 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Lấy số dư hiện tại
        SELECT COALESCE(eb.current_balance, 0) INTO v_current_balance
        FROM employee_balances eb
        WHERE eb.employee_id = NEW.employee_id;
        
        -- Tính số dư mới (trừ đi số tiền expense)
        v_new_balance := v_current_balance - NEW.amount;
        
        -- Cập nhật số dư
        INSERT INTO employee_balances (employee_id, current_balance, total_spent)
        VALUES (NEW.employee_id, v_new_balance, NEW.amount)
        ON CONFLICT (employee_id) 
        DO UPDATE SET 
            current_balance = v_new_balance,
            total_spent = employee_balances.total_spent + NEW.amount,
            updated_at = NOW();
        
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

-- 7. Tạo trigger để tự động cập nhật balance khi expense được approve
DROP TRIGGER IF EXISTS trigger_update_balance_on_expense_approval ON expense_requests;
CREATE TRIGGER trigger_update_balance_on_expense_approval
    AFTER UPDATE ON expense_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_balance_on_expense_approval();

-- 8. Tạo function để điều chỉnh số dư thủ công
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
    -- Lấy số dư hiện tại
    SELECT COALESCE(eb.current_balance, 0) INTO v_current_balance
    FROM employee_balances eb
    WHERE eb.employee_id = p_employee_id;
    
    -- Tính số dư mới
    v_new_balance := v_current_balance + p_amount;
    
    -- Cập nhật số dư
    INSERT INTO employee_balances (employee_id, current_balance, total_received, total_spent)
    VALUES (
        p_employee_id, 
        v_new_balance, 
        CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
        CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END
    )
    ON CONFLICT (employee_id) 
    DO UPDATE SET 
        current_balance = v_new_balance,
        total_received = employee_balances.total_received + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
        total_spent = employee_balances.total_spent + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
        updated_at = NOW();
    
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

-- 9. Tạo function để lấy thông tin số dư nhân viên
CREATE OR REPLACE FUNCTION get_employee_balance_info(p_employee_id UUID)
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(255),
    employee_code VARCHAR(50),
    current_balance DECIMAL(15,2),
    total_received DECIMAL(15,2),
    total_spent DECIMAL(15,2),
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.employee_code,
        COALESCE(eb.current_balance, 0),
        COALESCE(eb.total_received, 0),
        COALESCE(eb.total_spent, 0),
        eb.last_updated
    FROM employees e
    LEFT JOIN employee_balances eb ON e.id = eb.employee_id
    WHERE e.id = p_employee_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Tạo function để lấy lịch sử giao dịch
CREATE OR REPLACE FUNCTION get_employee_transaction_history(
    p_employee_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    transaction_type VARCHAR(20),
    amount DECIMAL(15,2),
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    created_by_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ebt.id,
        ebt.transaction_type,
        ebt.amount,
        ebt.balance_before,
        ebt.balance_after,
        ebt.description,
        ebt.notes,
        ebt.created_at,
        e.name as created_by_name
    FROM employee_balance_transactions ebt
    LEFT JOIN employees e ON ebt.created_by = e.id
    WHERE ebt.employee_id = p_employee_id
    ORDER BY ebt.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 11. Tạo function để lấy tổng hợp số dư tất cả nhân viên
CREATE OR REPLACE FUNCTION get_all_employee_balances()
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(255),
    employee_code VARCHAR(50),
    department_name VARCHAR(255),
    position_name VARCHAR(255),
    current_balance DECIMAL(15,2),
    total_received DECIMAL(15,2),
    total_spent DECIMAL(15,2),
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.employee_code,
        d.name as department_name,
        p.name as position_name,
        COALESCE(eb.current_balance, 0),
        COALESCE(eb.total_received, 0),
        COALESCE(eb.total_spent, 0),
        eb.last_updated
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN employee_balances eb ON e.id = eb.employee_id
    WHERE e.status = 'active'
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

-- 12. Tạo function để thanh toán cuối tháng
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

-- 13. Tạo bảng cho các cài đặt quản lý số dư
CREATE TABLE IF NOT EXISTS balance_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Insert các cài đặt mặc định
INSERT INTO balance_settings (setting_key, setting_value, description) VALUES
('auto_deduct_expenses', 'true', 'Tự động trừ tiền khi expense được approve'),
('allow_negative_balance', 'true', 'Cho phép số dư âm'),
('monthly_settlement_reminder', 'true', 'Nhắc nhở thanh toán cuối tháng'),
('balance_notification_threshold', '-1000000', 'Ngưỡng cảnh báo số dư âm (VND)')
ON CONFLICT (setting_key) DO NOTHING;

-- 15. Tạo view để dễ dàng truy vấn thông tin số dư
CREATE OR REPLACE VIEW employee_balance_summary AS
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.employee_code,
    d.name as department_name,
    p.name as position_name,
    COALESCE(eb.current_balance, 0) as current_balance,
    COALESCE(eb.total_received, 0) as total_received,
    COALESCE(eb.total_spent, 0) as total_spent,
    eb.last_updated,
    CASE 
        WHEN COALESCE(eb.current_balance, 0) < 0 THEN 'negative'
        WHEN COALESCE(eb.current_balance, 0) > 0 THEN 'positive'
        ELSE 'zero'
    END as balance_status
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN employee_balances eb ON e.id = eb.employee_id
WHERE e.status = 'active';

-- 16. Tạo RLS policies cho bảo mật
ALTER TABLE employee_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_settings ENABLE ROW LEVEL SECURITY;

-- Policy cho employee_balances
CREATE POLICY "Employees can view their own balance" ON employee_balances
    FOR SELECT USING (auth.uid() IN (
        SELECT auth_user_id FROM employees WHERE id = employee_id
    ));

CREATE POLICY "Admins can view all balances" ON employee_balances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'hr')
        )
    );

-- Policy cho employee_balance_transactions
CREATE POLICY "Employees can view their own transactions" ON employee_balance_transactions
    FOR SELECT USING (auth.uid() IN (
        SELECT auth_user_id FROM employees WHERE id = employee_id
    ));

CREATE POLICY "Admins can view all transactions" ON employee_balance_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'hr')
        )
    );

-- Policy cho balance_settings
CREATE POLICY "Admins can manage balance settings" ON balance_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'hr')
        )
    );

-- =============================================
-- Kết thúc script
-- =============================================
