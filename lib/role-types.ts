// Centralized role type definitions for the HRM system

// Database roles (as stored in the database)
export type DatabaseRole = 'admin' | 'hr' | 'accountant' | 'employee' | 'lead';

// UI roles (for frontend display and logic)
export type UIRole = 'Admin' | 'HR' | 'Employee' | 'Accountant';

// Role mapping from database to UI
export const mapDatabaseRoleToUI = (dbRole: DatabaseRole): UIRole => {
  switch (dbRole) {
    case 'admin':
      return 'Admin';
    case 'hr':
      return 'HR';
    case 'accountant':
      return 'Accountant';
    case 'employee':
    case 'lead':
    default:
      return 'Employee';
  }
};

// ===== ADMIN PERMISSIONS =====
// Check if a role has admin capabilities (highest level access)
export const hasAdminAccess = (dbRole: DatabaseRole): boolean => {
  return dbRole === 'admin';
};

// Check if a role can manage system settings
export const canManageSystemSettings = (dbRole: DatabaseRole): boolean => {
  return dbRole === 'admin';
};

// Check if a role can manage user roles and permissions
export const canManageRoles = (dbRole: DatabaseRole): boolean => {
  return dbRole === 'admin';
};

// Check if a role can access audit logs
export const canAccessAuditLogs = (dbRole: DatabaseRole): boolean => {
  return dbRole === 'admin';
};

// Check if a role can manage notifications
export const canManageNotifications = (dbRole: DatabaseRole): boolean => {
  return dbRole === 'admin';
};

// ===== HR PERMISSIONS =====
// Check if a role has HR capabilities
export const hasHRAccess = (dbRole: DatabaseRole): boolean => {
  return dbRole === 'hr';
};

// Check if a role can manage employees (HR specific)
export const canManageEmployees = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr'].includes(dbRole);
};

// Check if a role can approve leave requests
export const canApproveLeaveRequests = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr'].includes(dbRole);
};

// Check if a role can approve expense requests
export const canApproveExpenseRequests = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr'].includes(dbRole);
};

// Check if a role can view all employee data
export const canViewAllEmployees = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr'].includes(dbRole);
};

// ===== FINANCE PERMISSIONS =====
// Check if a role can access finance management
export const hasFinanceManagementAccess = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr', 'accountant'].includes(dbRole);
};

// Check if a role can manage payroll
export const canManagePayroll = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr', 'accountant'].includes(dbRole);
};

// Check if a role can manage budgets
export const canManageBudgets = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'accountant'].includes(dbRole);
};

// ===== GENERAL PERMISSIONS =====
// Check if a role has management capabilities
export const hasManagementAccess = (dbRole: DatabaseRole): boolean => {
  return ['admin', 'hr', 'accountant', 'lead'].includes(dbRole);
};

// Check if a role can toggle between management and personal views
export const canToggleViews = (dbRole: DatabaseRole): boolean => {
  return hasManagementAccess(dbRole);
};

// ===== LEGACY FUNCTIONS (for backward compatibility) =====
// These will be deprecated and replaced with specific permission functions
export const hasEmployeeManagementAccess = (dbRole: DatabaseRole): boolean => {
  return canManageEmployees(dbRole);
};

// Get role display name in Vietnamese
export const getRoleDisplayName = (dbRole: DatabaseRole): string => {
  const roleNames: Record<DatabaseRole, string> = {
    'admin': 'Quản trị viên',
    'hr': 'Nhân sự',
    'accountant': 'Kế toán',
    'employee': 'Nhân viên',
    'lead': 'Trưởng nhóm'
  };
  return roleNames[dbRole] || 'Nhân viên';
};
