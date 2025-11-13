export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  category: "payroll" | "attendance" | "leave" | "expense" | "system" | "announcement"
  is_read: boolean
  created_at: string
  updated_at: string
  created_by?: string
  target_role?: "admin" | "hr" | "lead" | "accountant" | "employee"
  target_users?: string[]
  priority: "low" | "medium" | "high"
  action_url?: string
  action_text?: string
  // Joined data từ employee table
  creator?: {
    id: string
    name: string
    email: string
  }
}

export interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  categories: {
    payroll: boolean
    attendance: boolean
    leave: boolean
    expense: boolean
    system: boolean
    announcement: boolean
  }
}

// Request types
export interface CreateNotificationRequest {
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  category: "payroll" | "attendance" | "leave" | "expense" | "system" | "announcement"
  target_role?: "admin" | "hr" | "lead" | "accountant" | "employee"
  target_users?: string[]
  priority?: "low" | "medium" | "high"
  action_url?: string
  action_text?: string
}
