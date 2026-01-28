import { apiClient, API_ENDPOINTS } from './api';
import type { ApiResponse } from './api';

// Types
export interface Employee {
  id: string;
  auth_user_id?: string;
  employee_code: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  department_id?: string;
  position_id?: string;
  lead_id?: string;
  manager_id?: string;
  start_date: string;
  end_date?: string;
  base_salary: number;
  status: 'invite_sent' | 'pending' | 'active' | 'inactive' | 'terminated' | 'probation';
  role: 'admin' | 'hr' | 'accountant' | 'employee';
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;

  // Thông tin cá nhân chi tiết
  gender?: string // Nam/Nữ
  marital_status?: string // Tình trạng hôn nhân
  children_count?: number // Số người con
  ethnicity?: string // Dân tộc
  religion?: string // Tôn giáo
  nationality?: string // Quốc tịch
  id_number?: string // Số CCCD/Số hộ chiếu
  social_insurance_number?: string // Số BHXH
  tax_code?: string // Mã số thuế
  education_level?: string // Trình độ học vấn
  personal_email?: string // Email cá nhân
  permanent_address?: string // Địa chỉ thường trú
  current_address?: string // Địa chỉ tạm trú
  bank_account?: string // Số tài khoản
  bank_name?: string // Ngân hàng

  // Thông tin hợp đồng
  probation_start_date?: string // Ngày thử việc
  probation_end_date?: string // Ngày kết thúc thử việc
  probation_result?: string // Kết quả thử việc
  related_files?: string[] // Hồ sơ liên quan
  official_start_date?: string // Ngày chính thức
  contract_type?: string // Loại hợp đồng
  contract_end_date?: string // Ngày hết hạn hợp đồng
  contract_file_url?: string // Link file hợp đồng
  termination_date?: string // Ngày nghỉ việc
  termination_reason?: string // Lý do nghỉ việc

  // Tài liệu
  id_card_front_url?: string // Ảnh chụp CCCD (mặt trước)
  id_card_back_url?: string // Ảnh chụp CCCD (mặt sau)
  work_permit_url?: string // Scan Giấy phép lao động
  id_card_issue_date?: string // Ngày cấp CCCD
  id_card_issue_place?: string // Nơi cấp CCCD
  health_insurance_place?: string // Nơi đăng ký khám chữa bệnh ban đầu

  // Thông tin lương và phúc lợi
  meal_allowance?: number // Phụ cấp ăn trưa
  transport_allowance?: number // Phụ cấp đi lại
  phone_allowance?: number // Phụ cấp điện thoại
  attendance_allowance?: number // Phụ cấp chuyên cần
  company_insurance_amount?: number // BH công ty đóng
  employee_insurance_amount?: number // BH nhân viên đóng
  personal_deduction?: number // Giảm trừ gia cảnh
  tax_type?: string // Loại thuế
  salary_history?: string // Lịch sử lương

  // Thông tin công việc
  attendance_status?: string // Chấm công
  job_level?: string // Cấp bậc
  job_position?: string // Vị trí công việc
  department_name?: string // Phòng ban
  direct_manager?: string // Quản lý trực tiếp
  manager_email?: string // Email Quản lý trực tiếp
  total_leave_hours?: number // Tổng số giờ nghỉ
  leave_days_used?: number // Xin nghỉ phép
  preferences?: string // Sở thích

  // Joined data from related tables
  department?: {
    id: string;
    name: string;
    description?: string;
  };
  position?: {
    id: string;
    name: string;
    description?: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Position {
  id: string;
  name: string;
  department_id?: string;
  description?: string;
  base_salary?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  status: 'present_full' | 'present_half' | 'paid_leave' | 'unpaid_leave' | 'sick_leave' | 'overtime' | 'weekend_overtime' | 'absent';
  check_in_time?: string;
  check_out_time?: string;
  working_hours?: number;
  overtime_hours?: number;
  work_value?: number; // Giá trị công (0-1, ví dụ: 0.75 = 3/4 công)
  late_minutes?: number; // Số phút đi trễ
  early_minutes?: number; // Số phút về sớm
  total_minutes?: number; // Tổng số phút làm việc
  day_of_week?: string; // Thứ trong tuần
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  working_days: number;
  actual_working_days?: number;
  actual_base_salary?: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  phone_allowance: number;
  position_allowance: number;
  attendance_allowance: number;
  other_allowances: number;
  total_allowances: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_pay: number;
  social_insurance_employee: number;
  health_insurance_employee: number;
  unemployment_insurance_employee: number;
  union_fee_employee: number;
  social_insurance_company: number;
  health_insurance_company: number;
  unemployment_insurance_company: number;
  union_fee_company: number;
  gross_income: number;
  income_after_insurance?: number;
  personal_deduction: number;
  dependent_deduction: number;
  number_of_dependents: number;
  taxable_income?: number;
  income_tax: number;
  total_deductions: number;
  net_salary: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  payment_date?: string;
  payment_method?: 'bank_transfer' | 'cash' | 'check';
  bank_account?: string;
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  notification_type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  read_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Authentication Services
export const authService = {
  async getCurrentUser(): Promise<ApiResponse<Employee>> {
    return apiClient.get(API_ENDPOINTS.AUTH.ME);
  },
};

// Employee Services
export const employeeService = {
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.LIST);
  },

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return apiClient.get(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
  },

  async createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Employee>> {
    return apiClient.post(API_ENDPOINTS.EMPLOYEES.CREATE, employee);
  },

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return apiClient.put(API_ENDPOINTS.EMPLOYEES.UPDATE(id), employee);
  },

  async deleteEmployee(id: string): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.EMPLOYEES.DELETE(id));
  },
};

// Department Services
export const departmentService = {
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    return apiClient.get(API_ENDPOINTS.DEPARTMENTS.LIST);
  },

  async getDepartment(id: string): Promise<ApiResponse<Department>> {
    return apiClient.get(API_ENDPOINTS.DEPARTMENTS.DETAIL(id));
  },

  async createDepartment(department: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Department>> {
    return apiClient.post(API_ENDPOINTS.DEPARTMENTS.CREATE, department);
  },

  async updateDepartment(id: string, department: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiClient.put(API_ENDPOINTS.DEPARTMENTS.UPDATE(id), department);
  },

  async deleteDepartment(id: string): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.DEPARTMENTS.DELETE(id));
  },
};

// Position Services
export const positionService = {
  async getPositions(): Promise<ApiResponse<Position[]>> {
    return apiClient.get(API_ENDPOINTS.POSITIONS.LIST);
  },

  async getPosition(id: string): Promise<ApiResponse<Position>> {
    return apiClient.get(API_ENDPOINTS.POSITIONS.DETAIL(id));
  },

  async createPosition(position: Omit<Position, 'id' | 'created_at' | 'updated_at' | 'base_salary'>): Promise<ApiResponse<Position>> {
    return apiClient.post(API_ENDPOINTS.POSITIONS.CREATE, position);
  },

  async updatePosition(id: string, position: Partial<Position>): Promise<ApiResponse<Position>> {
    return apiClient.put(API_ENDPOINTS.POSITIONS.UPDATE(id), position);
  },

  async deletePosition(id: string): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.POSITIONS.DELETE(id));
  },
};

// Attendance Services
export const attendanceService = {
  async getAttendances(month?: number, year?: number): Promise<ApiResponse<Attendance[]>> {
    const params = new URLSearchParams();
    if (month) params.append('month', String(month));
    if (year) params.append('year', String(year));
    const url = params.toString()
      ? `${API_ENDPOINTS.ATTENDANCE.LIST}?${params.toString()}`
      : API_ENDPOINTS.ATTENDANCE.LIST;
    return apiClient.get(url);
  },

  async getAttendance(id: string): Promise<ApiResponse<Attendance>> {
    return apiClient.get(API_ENDPOINTS.ATTENDANCE.DETAIL(id));
  },

  async createAttendance(attendance: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Attendance>> {
    return apiClient.post(API_ENDPOINTS.ATTENDANCE.CREATE, attendance);
  },

  async updateAttendance(id: string, attendance: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    return apiClient.put(API_ENDPOINTS.ATTENDANCE.UPDATE(id), attendance);
  },

  async deleteAttendance(id: string): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.ATTENDANCE.DELETE(id));
  },

  async checkIn(employeeId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.ATTENDANCE.CHECK_IN, { employee_id: employeeId });
  },

  async checkOut(employeeId: string, overtimeHours?: number): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.ATTENDANCE.CHECK_OUT, { 
      employee_id: employeeId, 
      overtime_hours: overtimeHours || 0 
    });
  },

  async getAttendanceStats(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.ATTENDANCE.STATS);
  },

  async getAttendanceSummary(month: number, year: number): Promise<ApiResponse<any[]>> {
    return apiClient.post(API_ENDPOINTS.ATTENDANCE.SUMMARY, { month, year });
  },
};

// Salary Regulations Service
export const salaryRegulationsService = {
  async getLatest(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.SALARY_REGULATIONS.LATEST);
  },
  async create(data: any): Promise<any> {
    return apiClient.post(API_ENDPOINTS.SALARY_REGULATIONS.CREATE, data);
  }
}

// Payroll Services
export const payrollService = {
  async getAll(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.LIST);
  },
  async getById(id: string): Promise<any> {
    return apiClient.get(API_ENDPOINTS.PAYROLL.DETAIL(id));
  },
  async create(data: any): Promise<any> {
    return apiClient.post(API_ENDPOINTS.PAYROLL.CREATE, data);
  },
  async createBatch(records: any[], overwrite: boolean = false): Promise<any> {
    return apiClient.post(API_ENDPOINTS.PAYROLL.CREATE_BATCH, { records, overwrite });
  },
  async updateBatch(payrollIds: string[], status: string): Promise<any> {
    return apiClient.put(API_ENDPOINTS.PAYROLL.BULK_UPDATE, { payrollIds, status });
  },
  async update(id: string, data: any): Promise<any> {
    return apiClient.put(API_ENDPOINTS.PAYROLL.UPDATE(id), data);
  },
  async delete(id: string): Promise<any> {
    return apiClient.delete(API_ENDPOINTS.PAYROLL.DELETE(id));
  },
  async getEmployeesForPayroll(month: number, year: number): Promise<any> {
    return apiClient.get(`${API_ENDPOINTS.PAYROLL.EMPLOYEES_FOR_PAYROLL}?month=${month}&year=${year}`);
  },
  async updateByEmployeeMonthYear(employee_id: string, month: number, year: number, data: any): Promise<any> {
    return apiClient.put(`/payroll/employees?employee_id=${employee_id}&month=${month}&year=${year}`, data);
  },
  async exportPDF(month?: number, year?: number, payrollIds?: string[]): Promise<ApiResponse<{
    success: boolean;
    htmlContent: string;
    fileName: string;
  }>> {
    const payload: any = {};
    if (month) payload.month = month;
    if (year) payload.year = year;
    if (payrollIds && payrollIds.length > 0) payload.payrollIds = payrollIds;
    
    return apiClient.post(API_ENDPOINTS.PAYROLL.EXPORT_PDF, payload);
  },
};

// Notification Services
export const notificationService = {
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
  },

  async getNotification(id: string): Promise<ApiResponse<Notification>> {
    return apiClient.get(API_ENDPOINTS.NOTIFICATIONS.DETAIL(id));
  },

  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Notification>> {
    return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.CREATE, notification);
  },

  async updateNotification(id: string, notification: Partial<Notification>): Promise<ApiResponse<Notification>> {
    return apiClient.put(API_ENDPOINTS.NOTIFICATIONS.UPDATE(id), notification);
  },

  async deleteNotification(id: string): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },

  async markAsRead(id: string): Promise<ApiResponse<Notification>> {
    return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id), undefined);
  },

  async markAllAsRead(): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, undefined);
  },

  async getUnreadCount(): Promise<ApiResponse<{ unread_count: number }>> {
    return apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  },
};

// Financials Service
export const financialsService = {
  async getFinancialsData(): Promise<ApiResponse<{ transactions: any[], categories: any[] }>> {
    return apiClient.get(API_ENDPOINTS.FINANCIALS.DATA);
  },
  async createTransaction(transactionData: any): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.FINANCIALS.DATA, transactionData);
  },
  async updateTransactionStatus(id: string, status: 'approved' | 'rejected'): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.FINANCIALS.UPDATE(id), { status });
  },
  async deleteTransaction(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(API_ENDPOINTS.FINANCIALS.DELETE(id));
  }
};

// Budget Service
export const budgetService = {
  async getBudgets(year?: number, month?: number, quarter?: number): Promise<ApiResponse<any[]>> {
    let url = API_ENDPOINTS.BUDGETS.LIST;
    const params = new URLSearchParams();
    
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (quarter) params.append('quarter', quarter.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return apiClient.get(url);
  },
  async createBudget(data: { budgetData: any, allocationsData: any[] }): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.BUDGETS.CREATE, data);
  },
  async updateBudget(id: string, data: { budgetData: any, allocationsData: any[] }): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.BUDGETS.UPDATE(id), data);
  },
  async deleteBudget(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(API_ENDPOINTS.BUDGETS.DELETE(id));
  },
};

// Accounts Service
export const accountsService = {
  async getAccounts(): Promise<ApiResponse<any[]>> {
    return apiClient.get(API_ENDPOINTS.ACCOUNTS.LIST);
  }
};

// Financial Target Service
export const financialTargetService = {
  async getTargets(): Promise<ApiResponse<any[]>> {
    return apiClient.get(API_ENDPOINTS.FINANCIAL_TARGETS.LIST);
  },
  async createTarget(data: any): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.FINANCIAL_TARGETS.CREATE, data);
  },
  async updateTarget(id: string, data: any): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.FINANCIAL_TARGETS.UPDATE(id), data);
  },
  async deleteTarget(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(API_ENDPOINTS.FINANCIAL_TARGETS.DELETE(id));
  }
};

// Budget Categories Service
export const budgetCategoriesService = {
  async getCategories(filters?: {
    type?: number; // 1=chi phí, 2=doanh thu
    parent_id?: string;
    tree?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type.toString());
    if (filters?.parent_id) params.append('parent_id', filters.parent_id);
    if (filters?.tree) params.append('tree', 'true');
    
    const url = params.toString() ? `/budget-categories?${params.toString()}` : '/budget-categories';
    return apiClient.get(url);
  },
  
  async getCategory(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/budget-categories/${id}`);
  },
  
  async createCategory(data: {
    code: string;
    name: string;
    parent_id?: string;
    category_type: number;
    description?: string;
    sort_order?: number;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/budget-categories', data);
  },
  
  async updateCategory(id: string, data: {
    name?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<ApiResponse<any>> {
    return apiClient.put(`/budget-categories/${id}`, data);
  },
  
  async deleteCategory(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(`/budget-categories/${id}`);
  }
};



// Leave Request Service
export const leaveRequestService = {
  async getLeaveRequests(filters?: {
    status?: string;
    leaveType?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.leaveType) params.append('leaveType', filters.leaveType);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const url = params.toString() ? `${API_ENDPOINTS.LEAVE_REQUESTS.LIST}?${params.toString()}` : API_ENDPOINTS.LEAVE_REQUESTS.LIST;
    return apiClient.get(url);
  },

  async getLeaveRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.LEAVE_REQUESTS.DETAIL(id));
  },

  async createLeaveRequest(data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    isUrgent?: boolean;
    notes?: string;
    employeeId?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.LEAVE_REQUESTS.CREATE, data);
  },

  async updateLeaveRequest(id: string, data: {
    status?: 'pending' | 'approved' | 'rejected';
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    notes?: string;
    isUrgent?: boolean;
    rejectionReason?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.LEAVE_REQUESTS.UPDATE(id), data);
  },

  async deleteLeaveRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(API_ENDPOINTS.LEAVE_REQUESTS.DELETE(id));
  },

  async approveLeaveRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.LEAVE_REQUESTS.UPDATE(id), {
      action: 'approve'
    });
  },

  async rejectLeaveRequest(id: string, reason: string): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.LEAVE_REQUESTS.UPDATE(id), {
      action: 'reject',
      rejectionReason: reason
    });
  },

  async checkOverlap(startDate: string, endDate: string, excludeRequestId?: string): Promise<ApiResponse<{
    hasOverlap: boolean;
    conflicts: any[];
    message: string;
  }>> {
    const params = new URLSearchParams({ startDate, endDate });
    if (excludeRequestId) {
      params.append('excludeRequestId', excludeRequestId);
    }
    return apiClient.get(`${API_ENDPOINTS.LEAVE_REQUESTS.BASE}/check-overlap?${params.toString()}`);
  }
};

export const leaveBalanceService = {
  async getCurrentEmployeeLeaveBalance(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.CURRENT_EMPLOYEE);
  },

  async getEmployeeLeaveBalance(employeeId: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.EMPLOYEE(employeeId));
  },

  async canCurrentEmployeeRequestLeave(requestedDays: number): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.CHECK_CURRENT_REQUEST, {
      requestedDays
    });
  },

  async canEmployeeRequestLeave(employeeId: string, requestedDays: number): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.CHECK_REQUEST(employeeId), {
      requestedDays
    });
  }
};

// Expense Request Service
export const expenseRequestService = {
  async getExpenseRequests(filters?: {
    status?: string;
    category?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const url = params.toString() ? `${API_ENDPOINTS.EXPENSE_REQUESTS.LIST}?${params.toString()}` : API_ENDPOINTS.EXPENSE_REQUESTS.LIST;
    return apiClient.get(url);
  },

  async getExpenseRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.EXPENSE_REQUESTS.DETAIL(id));
  },

  async createExpenseRequest(data: {
    category: string;
    description: string;
    amount: number;
    date: string;
    notes?: string;
    attachments?: string[];
    employeeId?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.EXPENSE_REQUESTS.CREATE, data);
  },

  async updateExpenseRequest(id: string, data: {
    status?: 'pending' | 'approved' | 'rejected';
    category?: string;
    description?: string;
    amount?: number;
    date?: string;
    notes?: string;
    attachments?: string[];
    rejectionReason?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.EXPENSE_REQUESTS.UPDATE(id), {
      action: 'update',
      ...data
    });
  },

  async deleteExpenseRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(API_ENDPOINTS.EXPENSE_REQUESTS.DELETE(id));
  },

  async approveExpenseRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.EXPENSE_REQUESTS.UPDATE(id), {
      action: 'approve'
    });
  },

  async rejectExpenseRequest(id: string, reason: string): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.EXPENSE_REQUESTS.UPDATE(id), {
      action: 'reject',
      rejectionReason: reason
    });
  }
};

// Budget Allocations Service
export const budgetAllocationsService = {
  async getAllocations(filters?: { 
    budget_id?: string; 
    category_id?: string; 
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.budget_id) params.append('budget_id', filters.budget_id);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    
    let url = API_ENDPOINTS.BUDGET_ALLOCATIONS.LIST;
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    return apiClient.get(url);
  },
  
  async getAllocation(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.BUDGET_ALLOCATIONS.DETAIL(id));
  },
  
  async createAllocation(data: {
    budget_id: string;
    category_id: string;
    allocated_amount: number;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.BUDGET_ALLOCATIONS.CREATE, data);
  },
  
  async updateAllocation(id: string, data: {
    allocated_amount?: number;
    used_amount?: number;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.BUDGET_ALLOCATIONS.UPDATE(id), data);
  },
  
  async deleteAllocation(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete(API_ENDPOINTS.BUDGET_ALLOCATIONS.DELETE(id));
  }
}; 