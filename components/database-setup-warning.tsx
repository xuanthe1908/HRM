"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  AlertTriangle, 
  Database, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Loader2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export function DatabaseSetupWarning() {
  const { user } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [checking, setChecking] = useState(true)
  const [sqlCopied, setSqlCopied] = useState(false)

  // Check if user can manage settings (Admin only)
  const canManageSettings = user && user.role === 'admin'

  const migrationSQL = `-- Migration: Create company_settings table
-- Copy and run this in Supabase SQL Editor

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
    overtime_rate INTEGER DEFAULT 150,
    personal_tax_deduction BIGINT DEFAULT 11000000,
    dependent_tax_deduction BIGINT DEFAULT 4400000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES employees(id)
);

-- Insert default settings
INSERT INTO company_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can read company settings" ON company_settings;
CREATE POLICY "Anyone can read company settings" ON company_settings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin/hr can update company settings" ON company_settings;
CREATE POLICY "Only admin/hr can update company settings" ON company_settings
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role IN ('admin', 'hr')
    )
);

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
GRANT INSERT, UPDATE ON company_settings TO authenticated;`

  const checkDatabaseSetup = async () => {
    if (!canManageSettings) {
      setChecking(false)
      return
    }

    try {
      setChecking(true)
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Check if we're getting real data (has id) or fallback data (no id)
        if (!data.id) {
          setShowWarning(true)
        } else {
          setShowWarning(false)
        }
      } else {
        setShowWarning(true)
      }
    } catch (error) {
      console.error('Error checking database setup:', error)
      setShowWarning(true)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkDatabaseSetup()
  }, [canManageSettings])

  const copySQL = async () => {
    try {
      await navigator.clipboard.writeText(migrationSQL)
      setSqlCopied(true)
      toast({
        title: "SQL đã được copy",
        description: "Paste vào Supabase SQL Editor và chạy",
      })
      setTimeout(() => setSqlCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Lỗi copy",
        description: "Không thể copy SQL. Vui lòng copy thủ công.",
        variant: "destructive",
      })
    }
  }

  if (checking) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Đang kiểm tra database...</AlertTitle>
        <AlertDescription>
          Vui lòng chờ trong khi hệ thống kiểm tra cấu hình database.
        </AlertDescription>
      </Alert>
    )
  }

  if (!canManageSettings || !showWarning) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Cần thiết lập database</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-4">
          Bảng <code>company_settings</code> chưa được tạo trong database. 
          Cài đặt sẽ không được lưu cho đến khi bạn chạy migration script.
        </p>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={copySQL}
              className="flex items-center gap-2"
            >
              {sqlCopied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {sqlCopied ? 'Đã copy!' : 'Copy SQL Migration'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://app.supabase.com', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Mở Supabase
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkDatabaseSetup}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Kiểm tra lại
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Hướng dẫn:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Click "Copy SQL Migration" để copy script</li>
              <li>Mở Supabase Dashboard → SQL Editor</li>
              <li>Paste script và click "Run"</li>
              <li>Quay lại đây và click "Kiểm tra lại"</li>
            </ol>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
} 