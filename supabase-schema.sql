-- =============================================
-- SUPABASE SCHEMA FOR HRM SYSTEM
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

-- Employee status
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'terminated', 'probation');

-- Leave request status
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Leave types
CREATE TYPE leave_type AS ENUM (
    'annual_leave',
    'sick_leave', 
    'personal_leave',
    'maternity_leave',
    'unpaid_leave',
    'other'
);

-- Transaction type
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- Transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');

-- Account type
CREATE TYPE account_type AS ENUM ('company', 'cash');

-- Notification type
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Notification category
CREATE TYPE notification_category AS ENUM (
    'payroll', 
    'attendance', 
    'leave', 
    'expense', 
    'system', 
    'announcement'
);

-- User role
CREATE TYPE user_role AS ENUM ('admin', 'hr', 'manager', 'employee');

-- Attendance status
CREATE TYPE attendance_status AS ENUM (
    'present_full',      -- Làm việc cả ngày
    'present_half',      -- Làm việc nửa ngày
    'meeting_full',      -- Họp nghị, học tập cả ngày
    'meeting_half',      -- Họp nghị, học tập nửa ngày
    'unpaid_leave',      -- Nghỉ không lương
    'paid_leave',        -- Nghỉ phép
    'sick_leave',        -- Nghỉ bệnh
    'overtime',          -- Tăng ca
    'absent'             -- Vắng mặt
);

-- Expense status
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- TABLES
-- =============================================

-- 1. Departments table
CREATE TABLE departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Positions table
CREATE TABLE positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, department_id)
);

-- 3. Employees table
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    department_id UUID REFERENCES departments(id),
    position_id UUID REFERENCES positions(id),
    manager_id UUID REFERENCES employees(id),
    start_date DATE NOT NULL,
    end_date DATE,
    base_salary DECIMAL(15,2) DEFAULT 0,
    status employee_status DEFAULT 'active',
    role user_role DEFAULT 'employee',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Salary allowances table (Phụ cấp)
CREATE TABLE salary_allowances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    housing_allowance DECIMAL(15,2) DEFAULT 0,
    transport_allowance DECIMAL(15,2) DEFAULT 0,
    meal_allowance DECIMAL(15,2) DEFAULT 0,
    phone_allowance DECIMAL(15,2) DEFAULT 0,
    position_allowance DECIMAL(15,2) DEFAULT 0,
    other_allowances DECIMAL(15,2) DEFAULT 0,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Salary deductions table (Khấu trừ)
CREATE TABLE salary_deductions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    personal_income_tax DECIMAL(15,2) DEFAULT 0,
    social_insurance DECIMAL(15,2) DEFAULT 0,
    health_insurance DECIMAL(15,2) DEFAULT 0,
    unemployment_insurance DECIMAL(15,2) DEFAULT 0,
    union_fee DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Attendance records table
CREATE TABLE attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 7. Leave requests table
CREATE TABLE leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,2) NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES employees(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    attachments TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Leave balances table
CREATE TABLE leave_balances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    annual_leave_total DECIMAL(4,2) DEFAULT 12,
    annual_leave_used DECIMAL(4,2) DEFAULT 0,
    sick_leave_total DECIMAL(4,2) DEFAULT 30,
    sick_leave_used DECIMAL(4,2) DEFAULT 0,
    personal_leave_total DECIMAL(4,2) DEFAULT 3,
    personal_leave_used DECIMAL(4,2) DEFAULT 0,
    maternity_leave_total DECIMAL(4,2) DEFAULT 180,
    maternity_leave_used DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, year)
);

-- 9. Payroll records table
CREATE TABLE payroll_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    
    -- Basic salary info
    base_salary DECIMAL(15,2) NOT NULL,
    working_days INTEGER DEFAULT 22,
    actual_working_days DECIMAL(4,2),
    actual_base_salary DECIMAL(15,2),
    
    -- Allowances
    housing_allowance DECIMAL(15,2) DEFAULT 0,
    transport_allowance DECIMAL(15,2) DEFAULT 0,
    meal_allowance DECIMAL(15,2) DEFAULT 0,
    phone_allowance DECIMAL(15,2) DEFAULT 0,
    position_allowance DECIMAL(15,2) DEFAULT 0,
    attendance_allowance DECIMAL(15,2) DEFAULT 0,
    other_allowances DECIMAL(15,2) DEFAULT 0,
    total_allowances DECIMAL(15,2) DEFAULT 0,
    
    -- Overtime
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    overtime_rate DECIMAL(5,2) DEFAULT 150,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    
    -- Insurance (Employee part)
    social_insurance_employee DECIMAL(15,2) DEFAULT 0,
    health_insurance_employee DECIMAL(15,2) DEFAULT 0,
    unemployment_insurance_employee DECIMAL(15,2) DEFAULT 0,
    union_fee_employee DECIMAL(15,2) DEFAULT 0,
    
    -- Insurance (Company part)
    social_insurance_company DECIMAL(15,2) DEFAULT 0,
    health_insurance_company DECIMAL(15,2) DEFAULT 0,
    unemployment_insurance_company DECIMAL(15,2) DEFAULT 0,
    union_fee_company DECIMAL(15,2) DEFAULT 0,
    
    -- Tax calculation
    gross_income DECIMAL(15,2) NOT NULL,
    income_after_insurance DECIMAL(15,2),
    personal_deduction DECIMAL(15,2) DEFAULT 11000000,
    dependent_deduction DECIMAL(15,2) DEFAULT 0,
    number_of_dependents INTEGER DEFAULT 0,
    taxable_income DECIMAL(15,2),
    income_tax DECIMAL(15,2) DEFAULT 0,
    
    -- Final calculation
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    payment_date DATE,
    payment_method VARCHAR(50),
    bank_account VARCHAR(100),
    
    created_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- 10. Financial categories table
CREATE TABLE financial_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type transaction_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Financial transactions table
CREATE TABLE financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type transaction_type NOT NULL,
    category_id UUID REFERENCES financial_categories(id),
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    date DATE NOT NULL,
    created_by UUID REFERENCES employees(id),
    status transaction_status DEFAULT 'pending',
    attachments TEXT[],
    notes TEXT,
    account_type account_type NOT NULL,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES employees(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Expense requests table
CREATE TABLE expense_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    status expense_status DEFAULT 'pending',
    submitted_date DATE DEFAULT CURRENT_DATE,
    attachments TEXT[],
    notes TEXT,
    approved_by UUID REFERENCES employees(id),
    approved_date DATE,
    rejected_by UUID REFERENCES employees(id),
    rejected_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    category notification_category NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES employees(id),
    target_role user_role,
    target_users UUID[],
    priority VARCHAR(20) DEFAULT 'medium',
    action_url TEXT,
    action_text VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Salary regulations table (Quy định lương)
CREATE TABLE salary_regulations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    basic_salary DECIMAL(15,2) DEFAULT 2340000,
    probation_salary_rate DECIMAL(5,2) DEFAULT 85,
    max_insurance_salary DECIMAL(15,2) DEFAULT 46800000,
    max_unemployment_salary DECIMAL(15,2) DEFAULT 46800000,
    working_days_per_month INTEGER DEFAULT 22,
    working_hours_per_day INTEGER DEFAULT 8,
    
    -- Overtime rates
    overtime_weekday_rate DECIMAL(5,2) DEFAULT 150,
    overtime_weekend_rate DECIMAL(5,2) DEFAULT 200,
    overtime_holiday_rate DECIMAL(5,2) DEFAULT 300,
    overtime_night_rate DECIMAL(5,2) DEFAULT 130,
    
    -- Company insurance rates
    company_social_insurance_rate DECIMAL(5,2) DEFAULT 17.5,
    company_health_insurance_rate DECIMAL(5,2) DEFAULT 3.0,
    company_unemployment_insurance_rate DECIMAL(5,2) DEFAULT 1.0,
    company_union_fee_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Employee insurance rates
    employee_social_insurance_rate DECIMAL(5,2) DEFAULT 8.0,
    employee_health_insurance_rate DECIMAL(5,2) DEFAULT 1.5,
    employee_unemployment_insurance_rate DECIMAL(5,2) DEFAULT 1.0,
    employee_union_fee_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Tax settings
    personal_deduction DECIMAL(15,2) DEFAULT 11000000,
    dependent_deduction DECIMAL(15,2) DEFAULT 4400000,
    non_resident_tax_rate DECIMAL(5,2) DEFAULT 20.0,
    
    effective_date DATE NOT NULL,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Employee dependents table (Người phụ thuộc)
CREATE TABLE employee_dependents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    birth_date DATE,
    id_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings table
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'Công ty TNHH TechViet Solutions',
    company_email VARCHAR(255) NOT NULL DEFAULT 'hr@techviet.com',
    company_phone VARCHAR(50) NOT NULL DEFAULT '+84 28 1234 5678',
    company_address TEXT NOT NULL DEFAULT '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
    tax_id VARCHAR(50) NOT NULL DEFAULT '0123456789',
    
    -- Notification settings
    payroll_notifications BOOLEAN DEFAULT true,
    onboarding_notifications BOOLEAN DEFAULT true,
    attendance_alerts BOOLEAN DEFAULT false,
    maintenance_notifications BOOLEAN DEFAULT true,
    
    -- Security settings
    two_factor_auth BOOLEAN DEFAULT true,
    session_timeout BOOLEAN DEFAULT true,
    audit_logging BOOLEAN DEFAULT true,
    session_timeout_minutes INTEGER DEFAULT 30,
    
    -- HR settings
    working_days_per_month INTEGER DEFAULT 22,
    overtime_rate INTEGER DEFAULT 150, -- percentage
    personal_tax_deduction BIGINT DEFAULT 11000000, -- VND
    dependent_tax_deduction BIGINT DEFAULT 4400000, -- VND
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES employees(id)
);

-- Insert default company settings
INSERT INTO company_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- RLS for company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read company settings
CREATE POLICY "Anyone can read company settings" ON company_settings
FOR SELECT USING (true);

-- Policy: Only admin/hr can update company settings  
CREATE POLICY "Only admin/hr can update company settings" ON company_settings
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role IN ('admin', 'hr')
    )
);

-- =============================================
-- INDEXES
-- =============================================

-- Employee indexes
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_position ON employees(position_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_email ON employees(email);

-- Attendance indexes
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);

-- Leave request indexes
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Payroll indexes
CREATE INDEX idx_payroll_employee_period ON payroll_records(employee_id, year, month);
CREATE INDEX idx_payroll_status ON payroll_records(status);

-- Financial transaction indexes
CREATE INDEX idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);

-- Notification indexes
CREATE INDEX idx_notifications_target_users ON notifications USING GIN(target_users);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_allowances_updated_at BEFORE UPDATE ON salary_allowances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_deductions_updated_at BEFORE UPDATE ON salary_deductions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON payroll_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_categories_updated_at BEFORE UPDATE ON financial_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_requests_updated_at BEFORE UPDATE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_regulations_updated_at BEFORE UPDATE ON salary_regulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_dependents_updated_at BEFORE UPDATE ON employee_dependents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate leave balance
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE leave_balances
        SET 
            annual_leave_used = CASE 
                WHEN NEW.leave_type = 'annual_leave' 
                THEN annual_leave_used + NEW.total_days 
                ELSE annual_leave_used 
            END,
            sick_leave_used = CASE 
                WHEN NEW.leave_type = 'sick_leave' 
                THEN sick_leave_used + NEW.total_days 
                ELSE sick_leave_used 
            END,
            personal_leave_used = CASE 
                WHEN NEW.leave_type = 'personal_leave' 
                THEN personal_leave_used + NEW.total_days 
                ELSE personal_leave_used 
            END,
            maternity_leave_used = CASE 
                WHEN NEW.leave_type = 'maternity_leave' 
                THEN maternity_leave_used + NEW.total_days 
                ELSE maternity_leave_used 
            END
        WHERE employee_id = NEW.employee_id 
        AND year = EXTRACT(YEAR FROM NEW.start_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leave_balance_on_approval
AFTER UPDATE ON leave_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_leave_balance();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert default departments
INSERT INTO departments (name, description) VALUES
('Công nghệ thông tin', 'Phòng IT và phát triển phần mềm'),
('Nhân sự', 'Phòng quản lý nhân sự'),
('Kế toán', 'Phòng kế toán tài chính'),
('Marketing', 'Phòng marketing và truyền thông'),
('Kinh doanh', 'Phòng kinh doanh và bán hàng');

-- Insert default financial categories
INSERT INTO financial_categories (name, type, description) VALUES
('Doanh thu dịch vụ', 'income', 'Thu nhập từ các dịch vụ chính'),
('Thu nhập khác', 'income', 'Các khoản thu nhập phụ'),
('Lãi đầu tư', 'income', 'Lợi nhuận từ đầu tư'),
('Thu từ bán tài sản', 'income', 'Thu nhập từ thanh lý tài sản'),
('Lương nhân viên', 'expense', 'Chi phí lương và phúc lợi'),
('Thuê văn phòng', 'expense', 'Chi phí thuê mặt bằng'),
('Điện nước', 'expense', 'Chi phí tiện ích'),
('Marketing', 'expense', 'Chi phí quảng cáo và marketing'),
('Thiết bị văn phòng', 'expense', 'Mua sắm thiết bị'),
('Đi lại', 'expense', 'Chi phí đi lại công tác'),
('Ăn uống', 'expense', 'Chi phí ăn uống'),
('Chi phí khác', 'expense', 'Các chi phí khác');

-- Insert default salary regulations
INSERT INTO salary_regulations (
    basic_salary,
    probation_salary_rate,
    max_insurance_salary,
    max_unemployment_salary,
    working_days_per_month,
    working_hours_per_day,
    effective_date
) VALUES (
    2340000,
    85,
    46800000,
    46800000,
    22,
    8,
    '2024-01-01'
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE employees IS 'Bảng lưu thông tin nhân viên';
COMMENT ON TABLE attendance_records IS 'Bảng chấm công nhân viên';
COMMENT ON TABLE leave_requests IS 'Bảng yêu cầu nghỉ phép';
COMMENT ON TABLE payroll_records IS 'Bảng bảng lương hàng tháng';
COMMENT ON TABLE financial_transactions IS 'Bảng giao dịch thu chi';
COMMENT ON TABLE expense_requests IS 'Bảng yêu cầu chi phí';
COMMENT ON TABLE notifications IS 'Bảng thông báo hệ thống';
COMMENT ON TABLE salary_regulations IS 'Bảng quy định lương và thuế'; 