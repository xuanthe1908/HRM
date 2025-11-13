import { supabaseAdmin } from '@/lib/supabase-server';
import { settingsService } from '@/lib/settings-service';

export interface AuditLogEntry {
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  status_code?: number;
  old_values?: any;
  new_values?: any;
}

export class AuditService {
  private static instance: AuditService;

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Check if audit logging is enabled
      const isEnabled = await settingsService.isAuditLoggingEnabled();
      if (!isEnabled) {
        console.log('💤 Audit logging disabled, skipping log entry:', entry.action);
        return;
      }

      console.log('📝 Logging audit entry:', entry.action, entry.resource);

      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          user_name: entry.user_name,
          user_email: entry.user_email,
          action: entry.action,
          resource: entry.resource,
          resource_id: entry.resource_id,
          details: entry.details,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          request_method: entry.request_method,
          request_url: entry.request_url,
          status_code: entry.status_code,
          old_values: entry.old_values,
          new_values: entry.new_values,
        });

      if (error) {
        console.error('❌ Failed to log audit entry:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        // Không throw lỗi để chương trình tiếp tục chạy
      }
    } catch (error) {
      console.error('💥 Audit logging error:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  // Convenience methods for common actions
  async logLogin(userId: string, userName: string, userEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'LOGIN',
      resource: 'auth/login',
      details: 'Đăng nhập thành công',
      ip_address: ipAddress,
      user_agent: userAgent,
      request_method: 'POST',
      status_code: 200
    });
  }

  async logLogout(userId: string, userName: string, userEmail: string, ipAddress?: string): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'LOGOUT',
      resource: 'auth/logout',
      details: 'Đăng xuất thành công',
      ip_address: ipAddress,
      request_method: 'POST',
      status_code: 200
    });
  }

  async logCreate(
    userId: string, 
    userName: string, 
    userEmail: string, 
    resource: string, 
    resourceId: string, 
    details: string,
    newValues?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'CREATE',
      resource: resource,
      resource_id: resourceId,
      details: details,
      new_values: newValues,
      ip_address: ipAddress,
      request_method: 'POST',
      status_code: 201
    });
  }

  async logUpdate(
    userId: string, 
    userName: string, 
    userEmail: string, 
    resource: string, 
    resourceId: string, 
    details: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'UPDATE',
      resource: resource,
      resource_id: resourceId,
      details: details,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      request_method: 'PUT',
      status_code: 200
    });
  }

  async logDelete(
    userId: string, 
    userName: string, 
    userEmail: string, 
    resource: string, 
    resourceId: string, 
    details: string,
    oldValues?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'DELETE',
      resource: resource,
      resource_id: resourceId,
      details: details,
      old_values: oldValues,
      ip_address: ipAddress,
      request_method: 'DELETE',
      status_code: 200
    });
  }

  async logSettingsUpdate(
    userId: string, 
    userName: string, 
    userEmail: string, 
    oldSettings?: any,
    newSettings?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'UPDATE_SETTINGS',
      resource: 'settings/company',
      details: 'Cập nhật cài đặt hệ thống',
      old_values: oldSettings,
      new_values: newSettings,
      ip_address: ipAddress,
      request_method: 'PUT',
      status_code: 200
    });
  }

  async logPayrollAction(
    userId: string, 
    userName: string, 
    userEmail: string, 
    action: 'GENERATE' | 'APPROVE' | 'REJECT',
    resourceId: string,
    details: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: `${action}_PAYROLL`,
      resource: 'payroll',
      resource_id: resourceId,
      details: details,
      ip_address: ipAddress,
      request_method: 'PUT',
      status_code: 200
    });
  }

  async logAccessDenied(
    resource: string,
    reason: string,
    userId?: string, 
    userName?: string, 
    userEmail?: string, 
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_name: userName || 'Unknown',
      user_email: userEmail,
      action: 'ACCESS_DENIED',
      resource: resource,
      details: reason,
      ip_address: ipAddress,
      user_agent: userAgent,
      status_code: 403
    });
  }
}

export const auditService = AuditService.getInstance(); 