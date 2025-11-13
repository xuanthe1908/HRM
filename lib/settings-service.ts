import { supabaseAdmin } from '@/lib/supabase-server';
import type { SystemSettings } from '@/app/api/settings/route';

export class SettingsService {
  private static instance: SettingsService;
  private settingsCache: SystemSettings | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async getSettings(): Promise<SystemSettings> {
    // Check cache first
    if (this.settingsCache && Date.now() < this.cacheExpiry) {
      return this.settingsCache;
    }

    try {
      // Get settings from database
      const { data: settings, error } = await supabaseAdmin
        .from('company_settings')
        .select('*')
        .single();

      if (error || !settings) {
        console.log('⚠️  Using default settings due to error:', error);
        // Return default settings if database fails
        return this.getDefaultSettings();
      }

      // Cache the settings
      this.settingsCache = settings;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      return settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): SystemSettings {
    return {
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
  }

  // Clear cache when settings are updated
  clearCache(): void {
    this.settingsCache = null;
    this.cacheExpiry = 0;
  }

  // Specific setting checks
  async isPayrollNotificationsEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.payroll_notifications;
  }

  async isOnboardingNotificationsEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.onboarding_notifications;
  }

  async isAttendanceAlertsEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.attendance_alerts;
  }

  async isMaintenanceNotificationsEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.maintenance_notifications;
  }

  async isTwoFactorAuthEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.two_factor_auth;
  }

  async isSessionTimeoutEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.session_timeout;
  }

  async getSessionTimeoutMinutes(): Promise<number> {
    const settings = await this.getSettings();
    return settings.session_timeout_minutes || 30;
  }

  async isAuditLoggingEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.audit_logging;
  }

  // Company settings
  async getCompanyInfo(): Promise<{
    name: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
  }> {
    const settings = await this.getSettings();
    return {
      name: settings.company_name,
      email: settings.company_email,
      phone: settings.company_phone,
      address: settings.company_address,
      taxId: settings.tax_id,
    };
  }

  // HR settings
  async getHRSettings(): Promise<{
    workingDaysPerMonth: number;
    overtimeRate: number;
    personalTaxDeduction: number;
    dependentTaxDeduction: number;
  }> {
    const settings = await this.getSettings();
    return {
      workingDaysPerMonth: settings.working_days_per_month,
      overtimeRate: settings.overtime_rate,
      personalTaxDeduction: settings.personal_tax_deduction,
      dependentTaxDeduction: settings.dependent_tax_deduction,
    };
  }
}

export const settingsService = SettingsService.getInstance(); 