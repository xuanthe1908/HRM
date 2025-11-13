import { supabaseAdmin } from '@/lib/supabase-server';
import { settingsService } from '@/lib/settings-service';
import type { CreateNotificationRequest } from '@/types/notification';

export interface NotificationTemplate {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: "payroll" | "attendance" | "leave" | "expense" | "system" | "announcement";
  priority?: "low" | "medium" | "high";
}

// Templates cho các loại thông báo
export const NOTIFICATION_TEMPLATES = {
  // Employee Dependent Requests
  DEPENDENT_REQUEST_CREATED: (employeeName: string, requestedCount: number): NotificationTemplate => ({
    title: "Yêu cầu người phụ thuộc mới",
    message: `${employeeName} đã gửi yêu cầu cập nhật số người phụ thuộc lên ${requestedCount}. Vui lòng xem xét và duyệt.`,
    type: "info",
    category: "system",
    priority: "medium"
  }),

  DEPENDENT_REQUEST_APPROVED: (requestedCount: number): NotificationTemplate => ({
    title: "Yêu cầu người phụ thuộc đã được duyệt",
    message: `Yêu cầu cập nhật số người phụ thuộc lên ${requestedCount} của bạn đã được phê duyệt.`,
    type: "success",
    category: "system",
    priority: "medium"
  }),

  DEPENDENT_REQUEST_REJECTED: (requestedCount: number, reason?: string): NotificationTemplate => ({
    title: "Yêu cầu người phụ thuộc bị từ chối",
    message: `Yêu cầu cập nhật số người phụ thuộc lên ${requestedCount} của bạn đã bị từ chối. ${reason ? `Lý do: ${reason}` : ''}`,
    type: "error",
    category: "system",
    priority: "high"
  }),
  // Expense Request Notifications
  EXPENSE_REQUEST_CREATED: (employeeName: string, amount: number, category: string): NotificationTemplate => ({
    title: "Yêu cầu chi phí mới cần duyệt",
    message: `${employeeName} đã tạo yêu cầu chi phí ${category} với số tiền ${formatCurrency(amount)}. Vui lòng xem xét và duyệt.`,
    type: "info",
    category: "expense",
    priority: "medium"
  }),

  EXPENSE_REQUEST_APPROVED: (category: string, amount: number): NotificationTemplate => ({
    title: "Yêu cầu chi phí đã được duyệt",
    message: `Yêu cầu chi phí ${category} với số tiền ${formatCurrency(amount)} của bạn đã được phê duyệt.`,
    type: "success",
    category: "expense",
    priority: "medium"
  }),

  EXPENSE_REQUEST_REJECTED: (category: string, amount: number, reason?: string): NotificationTemplate => ({
    title: "Yêu cầu chi phí bị từ chối",
    message: `Yêu cầu chi phí ${category} với số tiền ${formatCurrency(amount)} của bạn đã bị từ chối. ${reason ? `Lý do: ${reason}` : ''}`,
    type: "error",
    category: "expense",
    priority: "high"
  }),

  // Leave Request Notifications
  LEAVE_REQUEST_CREATED: (employeeName: string, leaveType: string, startDate: string, endDate: string): NotificationTemplate => ({
    title: "Yêu cầu nghỉ phép mới cần duyệt",
    message: `${employeeName} đã tạo yêu cầu nghỉ ${leaveType} từ ${formatDate(startDate)} đến ${formatDate(endDate)}. Vui lòng xem xét và duyệt.`,
    type: "info",
    category: "leave",
    priority: "medium"
  }),

  LEAVE_REQUEST_APPROVED: (leaveType: string, startDate: string, endDate: string): NotificationTemplate => ({
    title: "Yêu cầu nghỉ phép đã được duyệt",
    message: `Yêu cầu nghỉ ${leaveType} từ ${formatDate(startDate)} đến ${formatDate(endDate)} của bạn đã được phê duyệt.`,
    type: "success",
    category: "leave",
    priority: "medium"
  }),

  LEAVE_REQUEST_REJECTED: (leaveType: string, startDate: string, endDate: string, reason?: string): NotificationTemplate => ({
    title: "Yêu cầu nghỉ phép bị từ chối",
    message: `Yêu cầu nghỉ ${leaveType} từ ${formatDate(startDate)} đến ${formatDate(endDate)} của bạn đã bị từ chối. ${reason ? `Lý do: ${reason}` : ''}`,
    type: "error",
    category: "leave",
    priority: "high"
  }),

  // Payroll Notifications
  PAYROLL_GENERATED: (month: number, year: number): NotificationTemplate => ({
    title: "Bảng lương mới đã được tạo",
    message: `Bảng lương tháng ${month}/${year} của bạn đã được tạo. Vui lòng kiểm tra chi tiết.`,
    type: "success",
    category: "payroll",
    priority: "high"
  }),

  PAYROLL_APPROVED: (month: number, year: number): NotificationTemplate => ({
    title: "Bảng lương đã được phê duyệt",
    message: `Bảng lương tháng ${month}/${year} của bạn đã được phê duyệt và sẽ được thanh toán.`,
    type: "success",
    category: "payroll",
    priority: "high"
  }),

  PAYROLL_STATUS_UPDATE: (month: number, year: number, status: string): NotificationTemplate => {
    const statusMap: { [key: string]: string } = {
      pending: 'đang chờ xử lý',
      approved: 'đã được duyệt',
      paid: 'đã được thanh toán',
      rejected: 'đã bị từ chối'
    };
    const translatedStatus = statusMap[status] || status;
    
    return {
      title: `Cập nhật trạng thái bảng lương`,
      message: `Bảng lương tháng ${month}/${year} của bạn đã được cập nhật thành trạng thái "${translatedStatus}".`,
      type: "info",
      category: "payroll",
      priority: "medium"
    };
  },

  // Attendance Notifications
  ATTENDANCE_MISSING: (date: string): NotificationTemplate => ({
    title: "Thiếu chấm công",
    message: `Bạn chưa chấm công cho ngày ${formatDate(date)}. Vui lòng liên hệ HR để giải quyết.`,
    type: "warning",
    category: "attendance",
    priority: "medium"
  }),

  OVERTIME_APPROVED: (date: string, hours: number): NotificationTemplate => ({
    title: "Giờ làm thêm đã được duyệt",
    message: `${hours} giờ làm thêm của bạn vào ngày ${formatDate(date)} đã được phê duyệt.`,
    type: "success",
    category: "attendance",
    priority: "medium"
  }),

  // System Notifications
  SYSTEM_MAINTENANCE: (startTime: string, endTime: string): NotificationTemplate => ({
    title: "Thông báo bảo trì hệ thống",
    message: `Hệ thống sẽ được bảo trì từ ${startTime} đến ${endTime}. Vui lòng lưu công việc và đăng xuất trước thời gian này.`,
    type: "warning",
    category: "system",
    priority: "high"
  }),

  // Employee Notifications
  EMPLOYEE_WELCOME: (employeeName: string): NotificationTemplate => ({
    title: "Chào mừng đến với công ty!",
    message: `Xin chào ${employeeName}! Chào mừng bạn đến với đội ngũ của chúng tôi. Vui lòng hoàn thành thông tin hồ sơ cá nhân.`,
    type: "info",
    category: "system",
    priority: "medium"
  }),
};

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN');
}

// Main notification service class
export class NotificationService {
  // Gửi notification đến specific users
  static async sendToUsers(
    userIds: string[],
    template: NotificationTemplate,
    createdBy?: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<void> {
    try {
      const notificationData: CreateNotificationRequest = {
        ...template,
        target_users: userIds,
        action_url: actionUrl,
        action_text: actionText,
      };

      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          ...notificationData,
          created_by: createdBy,
        });

      if (error) {
        console.error('Error sending notification to users:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send notification to users:', error);
    }
  }

  // Gửi notification đến specific role
  static async sendToRole(
    role: "admin" | "hr" | "lead" | "accountant" | "employee",
    template: NotificationTemplate,
    createdBy?: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<void> {
    try {
      // Lấy danh sách user có role này
      const { data: targetUsers, error: userError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('role', role)
        .eq('status', 'active');

      if (userError) {
        console.error('Error fetching users with role:', userError);
        throw userError;
      }

      const userIds = targetUsers?.map(user => user.id) || [];

      const notificationData: any = {
        ...template,
        target_role: role,
        target_users: null, // Don't set target_users for role-based notifications
        action_url: actionUrl,
        action_text: actionText,
      };

      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          ...notificationData,
          created_by: createdBy,
        });

      if (error) {
        console.error('Error sending notification to role:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send notification to role:', error);
    }
  }

  // Gửi notification đến tất cả
  static async sendToAll(
    template: NotificationTemplate,
    createdBy?: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<void> {
    try {
      // Lấy danh sách tất cả user active
      const { data: allUsers, error: userError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('status', 'active');

      if (userError) {
        console.error('Error fetching all users:', userError);
        throw userError;
      }

      const userIds = allUsers?.map(user => user.id) || [];

      const notificationData: CreateNotificationRequest = {
        ...template,
        target_users: userIds,
        action_url: actionUrl,
        action_text: actionText,
      };

      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          ...notificationData,
          created_by: createdBy,
        });

      if (error) {
        console.error('Error sending notification to all:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send notification to all:', error);
    }
  }

  // Helper methods cho các sự kiện cụ thể

  // Expense Request Events
  static async notifyExpenseRequestCreated(
    expenseRequestId: string,
    employeeName: string,
    amount: number,
    category: string,
    createdBy?: string
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.EXPENSE_REQUEST_CREATED(employeeName, amount, category);
    // Only send to Admin and Accountant - HR no longer has access to expense management
    await this.sendToRole('admin', template, createdBy, `/manage-expenses`, 'Xem chi tiết');
    await this.sendToRole('accountant', template, createdBy, `/manage-expenses`, 'Xem chi tiết');
  }

  static async notifyExpenseRequestStatusChanged(
    employeeId: string,
    amount: number,
    category: string,
    status: 'approved' | 'rejected',
    reason?: string,
    createdBy?: string
  ): Promise<void> {
    const template = status === 'approved' 
      ? NOTIFICATION_TEMPLATES.EXPENSE_REQUEST_APPROVED(category, amount)
      : NOTIFICATION_TEMPLATES.EXPENSE_REQUEST_REJECTED(category, amount, reason);
    
    await this.sendToUsers([employeeId], template, createdBy, `/my-expenses`, 'Xem chi tiết');
  }

  // Leave Request Events
  static async notifyLeaveRequestCreated(
    leaveRequestId: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    createdBy?: string
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.LEAVE_REQUEST_CREATED(employeeName, leaveType, startDate, endDate);
    await this.sendToRole('hr', template, createdBy, `/manage-leave-requests`, 'Xem chi tiết');
    await this.sendToRole('admin', template, createdBy, `/manage-leave-requests`, 'Xem chi tiết');
  }

  static async notifyLeaveRequestStatusChanged(
    employeeId: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    status: 'approved' | 'rejected',
    reason?: string,
    createdBy?: string
  ): Promise<void> {
    const template = status === 'approved'
      ? NOTIFICATION_TEMPLATES.LEAVE_REQUEST_APPROVED(leaveType, startDate, endDate)
      : NOTIFICATION_TEMPLATES.LEAVE_REQUEST_REJECTED(leaveType, startDate, endDate, reason);
    
    await this.sendToUsers([employeeId], template, createdBy, `/my-leave-requests`, 'Xem chi tiết');
  }

  // Payroll Events
  static async notifyPayrollGenerated(
    employeeIds: string[],
    month: number,
    year: number,
    createdBy?: string
  ): Promise<void> {
    /*
    // Check if payroll notifications are enabled
    const isEnabled = await settingsService.isPayrollNotificationsEnabled();
    if (!isEnabled) {
      console.log('💤 Payroll notifications disabled, skipping payroll generated notification');
      return;
    }
    */

    console.log('📧 Sending payroll generated notifications to', employeeIds.length, 'employees');
    const template = NOTIFICATION_TEMPLATES.PAYROLL_GENERATED(month, year);
    await this.sendToUsers(employeeIds, template, createdBy, `/employee/payroll`, 'Xem lương');
  }

  static async notifyPayrollApproved(
    employeeIds: string[],
    month: number,
    year: number,
    createdBy?: string
  ): Promise<void> {
    /*
    // Check if payroll notifications are enabled
    const isEnabled = await settingsService.isPayrollNotificationsEnabled();
    if (!isEnabled) {
      console.log('💤 Payroll notifications disabled, skipping payroll approved notification');
      return;
    }
    */

    console.log('📧 Sending payroll approved notifications to', employeeIds.length, 'employees');
    const template = NOTIFICATION_TEMPLATES.PAYROLL_APPROVED(month, year);
    await this.sendToUsers(employeeIds, template, createdBy, `/employee/payroll`, 'Xem lương');
  }

  static async notifyPayrollStatusUpdate(
    employeeIds: string[],
    month: number,
    year: number,
    status: string,
    createdBy?: string
  ): Promise<void> {
    /*
    // Check if payroll notifications are enabled
    const isEnabled = await settingsService.isPayrollNotificationsEnabled();
    if (!isEnabled) {
      console.log('💤 Payroll notifications disabled, skipping payroll status update');
      return;
    }
    */

    console.log(`📧 Sending payroll status update (${status}) notifications to`, employeeIds.length, 'employees');
    const template = NOTIFICATION_TEMPLATES.PAYROLL_STATUS_UPDATE(month, year, status);
    await this.sendToUsers(employeeIds, template, createdBy, `/employee/payroll`, 'Xem lương');
  }

  // System Events
  static async notifySystemMaintenance(
    startTime: string,
    endTime: string,
    createdBy?: string
  ): Promise<void> {
    // Check if maintenance notifications are enabled
    const isEnabled = await settingsService.isMaintenanceNotificationsEnabled();
    if (!isEnabled) {
      console.log('💤 Maintenance notifications disabled, skipping system maintenance notification');
      return;
    }

    console.log('📧 Sending system maintenance notification to all users');
    const template = NOTIFICATION_TEMPLATES.SYSTEM_MAINTENANCE(startTime, endTime);
    await this.sendToAll(template, createdBy);
  }

  // Employee Events
  static async notifyEmployeeWelcome(
    employeeId: string,
    employeeName: string,
    createdBy?: string
  ): Promise<void> {
    // Check if onboarding notifications are enabled
    const isEnabled = await settingsService.isOnboardingNotificationsEnabled();
    if (!isEnabled) {
      console.log('💤 Onboarding notifications disabled, skipping employee welcome notification');
      return;
    }

    console.log('📧 Sending welcome notification to new employee:', employeeName);
    const template = NOTIFICATION_TEMPLATES.EMPLOYEE_WELCOME(employeeName);
    await this.sendToUsers([employeeId], template, createdBy, `/employee/profile`, 'Cập nhật hồ sơ');
  }

  // Attendance Events
  static async notifyAttendanceAlert(
    employeeId: string,
    employeeName: string,
    alertType: 'late' | 'absent' | 'early_leave',
    date: string,
    createdBy?: string
  ): Promise<void> {
    // Check if attendance alerts are enabled
    const isEnabled = await settingsService.isAttendanceAlertsEnabled();
    if (!isEnabled) {
      console.log('💤 Attendance alerts disabled, skipping attendance alert');
      return;
    }

    console.log('📧 Sending attendance alert for employee:', employeeName, 'Type:', alertType);
    
    const alertMessages = {
      late: `${employeeName} đến muộn vào ngày ${date}. Vui lòng kiểm tra và xử lý.`,
      absent: `${employeeName} vắng mặt không phép vào ngày ${date}. Vui lòng liên hệ xác minh.`,
      early_leave: `${employeeName} về sớm vào ngày ${date}. Vui lòng kiểm tra lý do.`
    };

    const template: NotificationTemplate = {
      title: "Cảnh báo chấm công",
      message: alertMessages[alertType],
      type: alertType === 'absent' ? "error" : "warning",
      category: "attendance",
      priority: "high"
    };

    // Send to HR and admin roles
    await this.sendToRole('hr', template, createdBy, `/attendance`, 'Xem chi tiết');
    await this.sendToRole('admin', template, createdBy, `/attendance`, 'Xem chi tiết');
  }
}

export default NotificationService; 