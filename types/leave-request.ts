export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  submitted_by: string
  submitted_at: string
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  is_urgent: boolean
  notes?: string
  created_at: string
  updated_at: string

  // Related data from joins
  employee?: {
    id: string
    name: string
    employee_code: string
    department?: {
      name: string
    }
    position?: {
      name: string
    }
  }
  submitted_by_employee?: {
    id: string
    name: string
    employee_code: string
  }
  approved_by_employee?: {
    id: string
    name: string
    employee_code: string
  }
  rejected_by_employee?: {
    id: string
    name: string
    employee_code: string
  }
}

export interface LeaveBalance {
  employee_id: string
  year: number
  annual: {
    total: number
    used: number
    remaining: number
  }
  sick: {
    total: number
    used: number
    remaining: number
  }
  personal: {
    total: number
    used: number
    remaining: number
  }
  maternity: {
    total: number
    used: number
    remaining: number
  }
}
