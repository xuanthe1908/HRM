export interface Employee {
  id: string
  employee_code: string
  email: string
  name: string
  phone?: string
  address?: string
  birth_date?: string
  department_id?: string
  position_id?: string
  manager_id?: string
  start_date: string
  end_date?: string
  base_salary: number
  status: 'active' | 'inactive' | 'terminated' | 'probation'
  role: 'admin' | 'hr' | 'lead' | 'accountant' | 'employee'
  avatar_url?: string
  created_at?: string
  updated_at?: string

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
    id: string
    name: string
    description?: string
  }
  position?: {
    id: string
    name: string
    description?: string
  }
  manager?: {
    id: string
    name: string
    email: string
  }
}

export interface PayrollCalculation {
  employeeId: string
  employeeName: string
  department: string
  position: string
  baseSalary: number
  allowances: {
    housing: number
    transport: number
    meal: number
    overtime: number
  }
  totalIncome: number
  deductions: {
    personalIncomeTax: number
    socialInsurance: number
    healthInsurance: number
    other: number
  }
  totalDeductions: number
  netSalary: number
  workingDays: number
  overtimeHours: number
}
