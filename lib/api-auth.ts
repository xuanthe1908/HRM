// Centralized API authorization utilities

import { supabaseAdmin } from './supabase-server';
import { 
  hasAdminAccess, 
  hasHRAccess, 
  canManageEmployees as canManageEmployeesRole, 
  canViewAllEmployees as canViewAllEmployeesRole,
  canApproveLeaveRequests as canApproveLeaveRequestsRole,
  canApproveExpenseRequests as canApproveExpenseRequestsRole,
  hasFinanceManagementAccess,
  canManagePayroll as canManagePayrollRole,
  canManageBudgets as canManageBudgetsRole,
  canManageSystemSettings as canManageSystemSettingsRole,
  canManageRoles as canManageRolesRole,
  canAccessAuditLogs as canAccessAuditLogsRole,
  canManageNotifications as canManageNotificationsRole,
  type DatabaseRole 
} from './role-types';

export interface AuthenticatedUser {
  id: string;
  role: DatabaseRole;
  name: string;
  email: string;
}

// Get user from JWT token
export async function getAuthenticatedUser(authHeader: string): Promise<AuthenticatedUser | null> {
  try {
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get user profile from employees table
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, role')
      .eq('auth_user_id', user.id)
      .single();

    if (employeeError || !employee) {
      return null;
    }

    return {
      id: employee.id,
      role: employee.role as DatabaseRole,
      name: employee.name,
      email: employee.email
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// ===== ADMIN-SPECIFIC PERMISSIONS =====
// Check if user has admin access
export function isAdmin(user: AuthenticatedUser): boolean {
  return hasAdminAccess(user.role);
}

// Check if user can manage system settings
export function canManageSystemSettings(user: AuthenticatedUser): boolean {
  return canManageSystemSettingsRole(user.role);
}

// Check if user can manage user roles
export function canManageUserRoles(user: AuthenticatedUser): boolean {
  return canManageRolesRole(user.role);
}

// Check if user can access audit logs
export function canAccessAuditLogs(user: AuthenticatedUser): boolean {
  return canAccessAuditLogsRole(user.role);
}

// Check if user can manage notifications
export function canManageNotifications(user: AuthenticatedUser): boolean {
  return canManageNotificationsRole(user.role);
}

// ===== HR-SPECIFIC PERMISSIONS =====
// Check if user has HR access
export function isHR(user: AuthenticatedUser): boolean {
  return hasHRAccess(user.role);
}

// Check if user can manage employees
export function canManageEmployees(user: AuthenticatedUser): boolean {
  return canManageEmployeesRole(user.role);
}

// Check if user can view all employee data
export function canViewAllEmployees(user: AuthenticatedUser): boolean {
  return canViewAllEmployeesRole(user.role);
}

// Check if user can approve leave requests
export function canApproveLeaveRequests(user: AuthenticatedUser): boolean {
  return canApproveLeaveRequestsRole(user.role);
}

// Check if user can approve expense requests
export function canApproveExpenseRequests(user: AuthenticatedUser): boolean {
  return canApproveExpenseRequestsRole(user.role);
}

// ===== FINANCE PERMISSIONS =====
// Check if user can access financial data
export function canAccessFinancialData(user: AuthenticatedUser): boolean {
  return hasFinanceManagementAccess(user.role);
}

// Check if user can manage payroll
export function canManagePayroll(user: AuthenticatedUser): boolean {
  return canManagePayrollRole(user.role);
}

// Check if user can manage budgets
export function canManageBudgets(user: AuthenticatedUser): boolean {
  return canManageBudgetsRole(user.role);
}

// ===== GENERAL PERMISSIONS =====
// Check if user can access employee data
export function canAccessEmployeeData(user: AuthenticatedUser, targetEmployeeId: string): boolean {
  // Admin/HR can access all employee data
  if (canViewAllEmployees(user)) {
    return true;
  }
  
  // Users can only access their own data
  return user.id === targetEmployeeId;
}

// Check if user can access leave requests
export function canAccessLeaveRequests(user: AuthenticatedUser, targetEmployeeId?: string): boolean {
  // Admin/HR can access all leave requests
  if (canApproveLeaveRequests(user)) {
    return true;
  }
  
  // Accountant can only access their own leave requests
  if (user.role === 'accountant') {
    return !targetEmployeeId || user.id === targetEmployeeId;
  }
  
  // Employee can only access their own leave requests
  return !targetEmployeeId || user.id === targetEmployeeId;
}

// Check if user can access expense requests
export function canAccessExpenseRequests(user: AuthenticatedUser, targetEmployeeId?: string): boolean {
  // Admin/HR/Accountant can access all expense requests
  if (hasFinanceManagementAccess(user.role)) {
    return true;
  }
  
  // Employee can only access their own expense requests
  return !targetEmployeeId || user.id === targetEmployeeId;
}

// Check if user can manage expense requests
export function canManageExpenseRequests(user: AuthenticatedUser): boolean {
  return hasFinanceManagementAccess(user.role);
}

// ===== LEGACY FUNCTIONS (for backward compatibility) =====
// These will be deprecated and replaced with specific permission functions
export function canApproveRequests(user: AuthenticatedUser): boolean {
  console.warn('canApproveRequests is deprecated. Use canApproveLeaveRequests or canApproveExpenseRequests instead.');
  return canApproveLeaveRequests(user);
}