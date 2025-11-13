export interface FinancialTransaction {
  id: string
  type: "income" | "expense"
  category_id: string
  description: string
  amount: number
  currency?: string
  date: string
  created_by?: string
  status: "pending" | "approved" | "rejected"
  attachments?: string[]
  notes?: string
  account_type: "company" | "cash"
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  created_at?: string
  updated_at?: string
}

export interface FinancialCategory {
  id: string
  name: string
  type: "income" | "expense"
  description?: string
}

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  netProfit: number
  monthlyIncome: number
  monthlyExpense: number
  pendingTransactions: number
}

export interface AccountBalance {
  companyAccount: number
  cashAccount: number
  totalBalance: number
}

export interface ExpenseRequest {
  id: string
  employee_id: string
  category: string
  description: string
  amount: number
  date: string
  status: "pending" | "approved" | "rejected"
  notes?: string
  attachments?: string[]
  rejection_reason?: string
  created_at?: string
  updated_at?: string
  submitted_date?: string
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  // Thêm các trường mới cho mapping
  is_mapped?: boolean
  mapping_info?: {
    mapping_id: string
    financial_transaction_id: string
    budget_category_id: string
    budget_category_name: string
    budget_category_code: string
    mapped_at: string
    mapped_by: string
    mapped_by_name: string
  } | null
  // Thêm thông tin employee
  employees?: {
    id: string
    name: string
    email: string
  }
}
