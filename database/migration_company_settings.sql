-- Migration: Create company_settings table
-- Run this in Supabase SQL Editor

-- Company Settings table
CREATE TABLE IF NOT EXISTS company_settings (
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

-- Insert default company settings if not exists
INSERT INTO company_settings (id, company_name, company_email, company_phone, company_address, tax_id) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Công ty TNHH TechViet Solutions', 'hr@techviet.com', '+84 28 1234 5678', '123 Đường Nguyễn Huệ, Quận 1, TP.HCM', '0123456789')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read company settings
DROP POLICY IF EXISTS "Anyone can read company settings" ON company_settings;
CREATE POLICY "Anyone can read company settings" ON company_settings
FOR SELECT USING (true);

-- Policy: Only admin/hr can update company settings  
DROP POLICY IF EXISTS "Only admin/hr can update company settings" ON company_settings;
CREATE POLICY "Only admin/hr can update company settings" ON company_settings
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role IN ('admin', 'hr')
    )
);

-- Policy: Only admin/hr can insert company settings (for upsert)
DROP POLICY IF EXISTS "Only admin/hr can insert company settings" ON company_settings;
CREATE POLICY "Only admin/hr can insert company settings" ON company_settings
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role IN ('admin', 'hr')
    )
);

-- Grant permissions
GRANT SELECT ON company_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON company_settings TO authenticated; 