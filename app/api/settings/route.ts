import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { settingsService } from '@/lib/settings-service';
import { auditService } from '@/lib/audit-service';

export interface SystemSettings {
  id?: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  tax_id: string;
  // Notification settings
  payroll_notifications: boolean;
  onboarding_notifications: boolean;
  attendance_alerts: boolean;
  maintenance_notifications: boolean;
  // Security settings
  two_factor_auth: boolean;
  session_timeout: boolean;
  audit_logging: boolean;
  session_timeout_minutes?: number;
  // Other settings
  working_days_per_month: number;
  overtime_rate: number;
  personal_tax_deduction: number;
  dependent_tax_deduction: number;
  created_at?: string;
  updated_at?: string;
}

// GET /api/settings - Lấy system settings từ database
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);

    console.log('🔍 Fetching company settings from database...');

    // Get company settings from database
    const { data: settings, error } = await supabaseAdmin
      .from('company_settings')
      .select('*')
      .single();

    console.log('📊 Database query result:', { settings, error });

    if (error) {
      console.error('❌ Error fetching company settings:', error);
      
      // If no settings found or table doesn't exist, return default settings
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('⚠️  No data found, returning default settings');
        const defaultSettings: SystemSettings = {
          company_name: "Công ty TNHH TechViet Solutions",
          company_email: "hr@techviet.com", 
          company_phone: "+84 28 1234 5678",
          company_address: "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
          tax_id: "0123456789",
          payroll_notifications: true,
          onboarding_notifications: true,
          attendance_alerts: false,
          maintenance_notifications: true,
          two_factor_auth: true,
          session_timeout: true,
          audit_logging: true,
          session_timeout_minutes: 30,
          working_days_per_month: 22,
          overtime_rate: 150,
          personal_tax_deduction: 11000000,
          dependent_tax_deduction: 4400000,
        };
        return NextResponse.json(defaultSettings);
      }
      
      throw error;
    }

    if (!settings) {
      console.log('⚠️  Settings is null, trying to fetch all records...');
      
      // Try to get any record
      const { data: allSettings, error: allError } = await supabaseAdmin
        .from('company_settings')
        .select('*')
        .limit(1);

      console.log('📊 All settings query:', { allSettings, allError });

      if (allSettings && allSettings.length > 0) {
        console.log('✅ Found settings in all records query');
        return NextResponse.json(allSettings[0]);
      }

      console.log('⚠️  No settings found at all, returning defaults');
      const defaultSettings: SystemSettings = {
        company_name: "Công ty TNHH TechViet Solutions",
        company_email: "hr@techviet.com", 
        company_phone: "+84 28 1234 5678",
        company_address: "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
        tax_id: "0123456789",
        payroll_notifications: true,
        onboarding_notifications: true,
        attendance_alerts: false,
        maintenance_notifications: true,
        two_factor_auth: true,
        session_timeout: true,
        audit_logging: true,
        session_timeout_minutes: 30,
        working_days_per_month: 22,
        overtime_rate: 150,
        personal_tax_deduction: 11000000,
        dependent_tax_deduction: 4400000,
      };
      return NextResponse.json(defaultSettings);
    }

    console.log('✅ Successfully fetched settings from database');
    return NextResponse.json(settings);
  } catch (error) {
    console.error('💥 Unexpected error in GET /api/settings:', error);
    return handleError(error);
  }
}

// PUT /api/settings - Cập nhật system settings vào database
export async function PUT(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    console.log('🔍 Updating company settings for user:', userId);
    
    // Check if user has permission to update settings (admin/hr only)
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      console.error('❌ User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUser.role !== 'admin') {
      console.error('❌ Unauthorized user role:', currentUser.role);
      
      // Log access denied
      await auditService.logAccessDenied(
        'settings/company',
        `Unauthorized attempt to update settings by ${currentUser.role}`,
        currentUser.id,
        currentUser.name,
        currentUser.email,
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        req.headers.get('user-agent') || undefined
      );
      
      return NextResponse.json({ error: 'Unauthorized to update settings' }, { status: 403 });
    }

    const settingsData = await req.json();
    console.log('📝 Settings data to update:', settingsData);

    // Get current settings for audit trail
    const oldSettings = await settingsService.getSettings();

    // Update or insert company settings with fixed ID
    const { data: updatedSettings, error: updateError } = await supabaseAdmin
      .from('company_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // Fixed ID for single company
        ...settingsData,
        updated_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating company settings:', updateError);
      throw updateError;
    }

    console.log('✅ Successfully updated settings:', updatedSettings);
    
    // Clear settings cache to ensure fresh data
    settingsService.clearCache();
    console.log('🔄 Settings cache cleared');
    
    // Log settings update for audit trail
    await auditService.logSettingsUpdate(
      currentUser.id,
      currentUser.name,
      currentUser.email,
      oldSettings,
      updatedSettings,
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
    );
    
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('💥 Unexpected error in PUT /api/settings:', error);
    return handleError(error);
  }
} 