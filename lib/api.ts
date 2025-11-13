// API Configuration
const API_BASE_URL = '/api'; // Trỏ đến API Routes của Next.js

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

class ApiClient {
  private baseURL: string;
  private onTokenExpired?: () => void;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Set callback để xử lý khi token hết hạn
  setTokenExpiredCallback(callback: () => void) {
    this.onTokenExpired = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // No Authorization header needed when using HttpOnly cookies

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const responseData = await response.json();
      
      if (!response.ok) {
        // Xử lý JWT hết hạn hoặc không hợp lệ
        if (response.status === 401 || response.status === 403) {
          const errorMessage = responseData.error || '';
          
          // Kiểm tra nếu là account terminated - KHÔNG trigger logout
          if (errorMessage === 'Account terminated') {
            console.warn('🚫 Account terminated - user status is terminated');
            // Không gọi onTokenExpired callback, chỉ trả về error
            return {
              error: responseData.error || `HTTP error! status: ${response.status}`,
              message: responseData.message,
              status: response.status
            };
          }
          // Kiểm tra các thông báo lỗi liên quan đến JWT
          else if (errorMessage.includes('Token has expired') || 
              errorMessage.includes('Invalid token') || 
              errorMessage.includes('Missing authorization header') ||
              errorMessage.includes('token')) {
            
            console.warn('🔐 JWT token expired or invalid, triggering logout...');
            
            // Gọi callback để xử lý logout
            if (this.onTokenExpired) {
              this.onTokenExpired();
            }
          }
        }
        
        // Giữ lại status code và error message
        return {
          error: responseData.error || `HTTP error! status: ${response.status}`,
          message: responseData.message, // Thêm message field
          status: response.status
        };
      }

      return { data: responseData };
    } catch (error) {
      // Xử lý lỗi network hoặc parse JSON
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Kiểm tra lỗi network có thể do token issues
      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        console.warn('🌐 Network error, possibly due to authentication issues');
      }
      
      return {
        error: errorMessage,
        status: 500
      };
    }
  }
  
  // GET request
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  // POST request
  async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// API endpoints (điều chỉnh lại cho phù hợp với API Routes)
export const API_ENDPOINTS = {
  AUTH: {
    ME: '/auth/me',
  },
  EMPLOYEES: {
    LIST: '/employees',
    CREATE: '/employees',
    DETAIL: (id: string) => `/employees/${id}`,
    UPDATE: (id: string) => `/employees/${id}`,
    DELETE: (id: string) => `/employees/${id}`,
  },
  DEPARTMENTS: {
    LIST: '/departments',
    CREATE: '/departments',
    DETAIL: (id: string) => `/departments/${id}`,
    UPDATE: (id: string) => `/departments/${id}`,
    DELETE: (id: string) => `/departments/${id}`,
  },
  POSITIONS: {
    LIST: '/positions',
    CREATE: '/positions',
    DETAIL: (id: string) => `/positions/${id}`,
    UPDATE: (id: string) => `/positions/${id}`,
    DELETE: (id: string) => `/positions/${id}`,
  },
  ATTENDANCE: {
    LIST: '/attendance',
    CREATE: '/attendance',
    DETAIL: (id: string) => `/attendance/${id}`,
    UPDATE: (id: string) => `/attendance/${id}`,
    DELETE: (id: string) => `/attendance/${id}`,
    CHECK_IN: '/attendance/check-in',
    CHECK_OUT: '/attendance/check-out',
    STATS: '/attendance/stats',
    SUMMARY: '/attendance/summary', // Changed to a static path for POST
  },
  PAYROLL: {
    LIST: '/payroll',
    CREATE: '/payroll',
    DETAIL: (id: string) => `/payroll/${id}`,
    UPDATE: (id: string) => `/payroll/${id}`,
    DELETE: (id: string) => `/payroll/${id}`,
    CREATE_BATCH: '/payroll/batch',
    BULK_UPDATE: '/payroll/bulk-update',
    EMPLOYEES_FOR_PAYROLL: '/payroll/employees',
    EXPORT_PDF: '/payroll/export-pdf',
  },
  SALARY_REGULATIONS: {
    LATEST: '/salary-regulations',
    CREATE: '/salary-regulations',
  },
  FINANCIALS: {
    DATA: '/financials',
    UPDATE: (id: string) => `/financials/${id}`,
    DELETE: (id: string) => `/financials/${id}`,
  },
  BUDGETS: {
    LIST: '/budgets',
    CREATE: '/budgets',
    DETAIL: (id: string) => `/budgets/${id}`,
    UPDATE: (id: string) => `/budgets/${id}`,
    DELETE: (id: string) => `/budgets/${id}`,
  },
  BUDGET_ALLOCATIONS: {
    LIST: '/budget-allocations',
    CREATE: '/budget-allocations',
    DETAIL: (id: string) => `/budget-allocations/${id}`,
    UPDATE: (id: string) => `/budget-allocations/${id}`,
    DELETE: (id: string) => `/budget-allocations/${id}`,
  },
  FINANCIAL_TARGETS: {
    LIST: '/financial-targets',
    CREATE: '/financial-targets',
    DETAIL: (id: string) => `/financial-targets/${id}`,
    UPDATE: (id: string) => `/financial-targets/${id}`,
    DELETE: (id: string) => `/financial-targets/${id}`,
  },
  ACCOUNTS: {
    LIST: '/accounts',
  },
  LEAVE_REQUESTS: {
    BASE: '/leave-requests',
    LIST: '/leave-requests',
    CREATE: '/leave-requests',
    DETAIL: (id: string) => `/leave-requests/${id}`,
    UPDATE: (id: string) => `/leave-requests/${id}`,
    DELETE: (id: string) => `/leave-requests/${id}`,
  },
  LEAVE_BALANCE: {
    CURRENT_EMPLOYEE: '/employee/leave-balance',
    EMPLOYEE: (id: string) => `/employees/${id}/leave-balance`,
    CHECK_REQUEST: (id: string) => `/employees/${id}/leave-balance`,
    CHECK_CURRENT_REQUEST: '/employee/leave-balance',
  },
  EXPENSE_REQUESTS: {
    LIST: '/expense-requests',
    CREATE: '/expense-requests',
    DETAIL: (id: string) => `/expense-requests/${id}`,
    UPDATE: (id: string) => `/expense-requests/${id}`,
    DELETE: (id: string) => `/expense-requests/${id}`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    CREATE: '/notifications',
    DETAIL: (id: string) => `/notifications/${id}`,
    UPDATE: (id: string) => `/notifications/${id}`,
    DELETE: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    UNREAD_COUNT: '/notifications/unread-count',
  },
} as const;

// Helper function to get auth headers
export const getAuthHeaders = (_token?: string): Record<string, string> => {
  // With cookie-based auth, client shouldn't attach Authorization.
  return {};
};