-- Migration: Create audit_logs table for system activity tracking
-- Run this in Supabase SQL Editor

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES employees(id),
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_url TEXT,
    status_code INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin can read audit logs
DROP POLICY IF EXISTS "Only admin can read audit logs" ON audit_logs;
CREATE POLICY "Only admin can read audit logs" ON audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role = 'admin'
    )
);

-- Policy: System can insert audit logs (for service account)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

-- Insert some sample audit logs for demo
INSERT INTO audit_logs (
    user_name, 
    user_email,
    action, 
    resource, 
    details, 
    ip_address,
    request_method,
    status_code,
    created_at
) VALUES 
('Admin', 'admin@company.com', 'LOGIN', 'auth/login', 'Đăng nhập thành công', '192.168.1.100', 'POST', 200, NOW() - INTERVAL '2 hours'),
('HR Manager', 'hr@company.com', 'UPDATE_SETTINGS', 'settings/company', 'Cập nhật thông tin công ty', '192.168.1.101', 'PUT', 200, NOW() - INTERVAL '1 hour'),
('Admin', 'admin@company.com', 'CREATE_EMPLOYEE', 'employees', 'Tạo nhân viên mới: Nguyễn Văn A', '192.168.1.100', 'POST', 201, NOW() - INTERVAL '30 minutes'),
('HR Manager', 'hr@company.com', 'APPROVE_LEAVE', 'leave_requests/123', 'Duyệt đơn xin nghỉ phép', '192.168.1.101', 'PUT', 200, NOW() - INTERVAL '15 minutes'),
('Admin', 'admin@company.com', 'DELETE_NOTIFICATION', 'notifications/456', 'Xóa thông báo hệ thống', '192.168.1.100', 'DELETE', 200, NOW() - INTERVAL '5 minutes'),
('Accountant', 'accountant@company.com', 'GENERATE_PAYROLL', 'payroll/batch', 'Tạo bảng lương tháng 12/2024', '192.168.1.102', 'POST', 201, NOW() - INTERVAL '3 minutes'),
('HR Manager', 'hr@company.com', 'UPDATE_EMPLOYEE', 'employees/789', 'Cập nhật thông tin nhân viên', '192.168.1.101', 'PUT', 200, NOW() - INTERVAL '1 minute'); 