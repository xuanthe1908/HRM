-- Fix company_settings table
-- Run this in Supabase SQL Editor

-- 1. Insert default record if not exists
INSERT INTO public.company_settings (
    id,
    company_name,
    company_email,
    company_phone,
    company_address,
    tax_id
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Công ty TNHH TechViet Solutions',
    'hr@techviet.com',
    '+84 28 1234 5678',
    '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
    '0123456789'
) ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (Row Level Security)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Only admin/hr can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Only admin/hr can insert company settings" ON public.company_settings;

-- 4. Create RLS policies
CREATE POLICY "Anyone can read company settings" 
ON public.company_settings FOR SELECT 
USING (true);

CREATE POLICY "Only admin/hr can update company settings" 
ON public.company_settings FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role IN ('admin', 'hr')
    )
);

CREATE POLICY "Only admin/hr can insert company settings" 
ON public.company_settings FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE employees.auth_user_id = auth.uid() 
        AND employees.role IN ('admin', 'hr')
    )
);

-- 5. Grant necessary permissions
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.company_settings TO authenticated;

-- 6. Check if data was inserted successfully
SELECT * FROM public.company_settings; 