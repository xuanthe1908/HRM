"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExpenseAttachmentUpload } from "@/components/expense-attachment-upload"
import { Plus, Receipt, Search, Eye, Edit, Upload, Clock, CheckCircle, XCircle, Wallet, TrendingUp, TrendingDown, Link as LinkIcon, Building2, X, MoreVertical } from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { expenseRequestService, budgetCategoriesService, financialsService } from "@/lib/services"
import { EmployeeBalanceService, EmployeeBalance } from "@/lib/employee-balance-service"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { 
  mapDatabaseRoleToUI, 
  hasAdminAccess,
  type DatabaseRole,
  type UIRole 
} from "@/lib/role-types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ExpenseAttachmentMeta {
  id?: string
  file_name: string
  file_size?: number
  mime_type?: string
  file_url?: string
  storage_path?: string
  uploaded_at?: string
}

interface ExpenseRequest {
  id: string
  employee_id: string
  category: string
  description: string
  amount: number
  date: string
  status: "pending" | "approved" | "rejected"
  submitted_date: string
  attachments?: string[]
  file_attachments?: ExpenseAttachmentMeta[]
  notes?: string
  approved_by?: string
  approved_date?: string
  rejected_by?: string
  rejected_date?: string
  rejection_reason?: string
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
}

const expenseCategories = ["Đi lại", "Ăn uống", "Khách sạn", "Văn phòng phẩm", "Đào tạo", "Thiết bị", "Khác"]

export default function ExpensesPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Check if this is personal view (from query or dedicated routes)
  const isPersonalView =
    searchParams.get('view') === 'personal' ||
    pathname === '/expenses/personal' ||
    pathname === '/my-expenses'
  
  // Map database role to UI role for permissions using centralized function
  const getUserRole = (): UIRole => {
    if (!user) return "Employee"
    return mapDatabaseRoleToUI(user.role as DatabaseRole)
  }
  
  const userRole = getUserRole()
  
  // Check if user is admin
  const isAdmin = (): boolean => {
    if (!user) return false
    return hasAdminAccess(user.role as DatabaseRole)
  }
  
  // Determine effective role based on view mode
  const getEffectiveRole = (): UIRole => {
    // If HR/Admin/Accountant user is in personal view, treat them as Employee
    if ((userRole === "HR" || userRole === "Accountant" || isAdmin()) && isPersonalView) {
      return "Employee"
    }
    return userRole
  }
  
  const effectiveRole = getEffectiveRole()
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<string>("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [approvingRequestId, setApprovingRequestId] = useState<string>("")
  const [employeeBalance, setEmployeeBalance] = useState<EmployeeBalance | null>(null)
  const [rejectingRequestIdForLoading, setRejectingRequestIdForLoading] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Form state for new expense request
  const [newRequest, setNewRequest] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [newRequestFiles, setNewRequestFiles] = useState<File[]>([])

  // Form state for editing expense request
  const [editRequest, setEditRequest] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [editRequestFiles, setEditRequestFiles] = useState<File[]>([])
  const [existingEditAttachments, setExistingEditAttachments] = useState<ExpenseAttachmentMeta[]>([])
  
  
  // State for approval modal (with budget category selection)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState<ExpenseRequest | null>(null)
  const [selectedApprovalBudgetCategory, setSelectedApprovalBudgetCategory] = useState<string>("none")
  const [isApproving, setIsApproving] = useState(false)

  // Detail and edit dialogs
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)
  const [attachmentLinks, setAttachmentLinks] = useState<Record<string, string>>({})
  const [budgetCategories, setBudgetCategories] = useState<any[]>([])
  const [isIntegrateDialogOpen, setIsIntegrateDialogOpen] = useState(false)
  const [integratingRequest, setIntegratingRequest] = useState<ExpenseRequest | null>(null)
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string>("none")
  const [isIntegrating, setIsIntegrating] = useState(false)
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>("")
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const currentUserId = user?.id || ""

  // Helper: upload files to Supabase Storage and return metadata array
  const uploadSelectedFiles = async (files: File[]): Promise<ExpenseAttachmentMeta[]> => {
    if (!files || files.length === 0) return []
    try {
      const form = new FormData()
      form.append('employee_id', currentUserId)
      files.forEach(f => form.append('files', f))
      const res = await fetch('/api/expense-requests/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('upload_failed')
      const json = await res.json()
      return (json.files || []) as ExpenseAttachmentMeta[]
    } catch (e) {
      console.error('uploadSelectedFiles error', e)
      toast({ title: 'Lỗi upload', description: 'Không thể tải tệp lên máy chủ', variant: 'destructive' })
      return []
    }
  }

  // Fetch expense requests
  const fetchExpenseRequests = async () => {
    try {
      setLoading(true)
      const filters: any = {}
      if (filterStatus !== "all") filters.status = filterStatus
      if (effectiveRole === "Employee") filters.employeeId = currentUserId
      const result = await expenseRequestService.getExpenseRequests(filters)
      if (result.data) {
        setExpenseRequests(result.data)
      } else {
        toast({ title: "Lỗi", description: "Không thể tải danh sách yêu cầu chi phí", variant: "destructive" })
      }
      
      // Fetch employee balance if user is employee
      if (effectiveRole === "Employee" && currentUserId) {
        try {
          const balance = await EmployeeBalanceService.getEmployeeBalance(currentUserId)
          setEmployeeBalance(balance)
        } catch (error) {
          console.error('Error fetching employee balance:', error)
        }
      }

      // Fetch budget categories for integration (only expense categories - category_type = 1)
      try {
        const categoriesResult = await budgetCategoriesService.getCategories({ tree: true })
        if (categoriesResult.data) {
          let actualData = categoriesResult.data;
          // Handle nested data structure
          if (typeof actualData === 'object' && actualData !== null && 'data' in actualData && Array.isArray((actualData as any).data)) {
            actualData = (actualData as any).data;
          }
          // Filter only expense categories (category_type = 1)
          if (Array.isArray(actualData)) {
            const expenseCategories = actualData.filter((cat: any) => cat.category_type === 1);
            console.log('✅ Expense categories loaded:', expenseCategories.length, 'categories');
            setBudgetCategories(expenseCategories);
          }
        }
      } catch (error) {
        console.error('Error fetching budget categories:', error)
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Đã có lỗi xảy ra khi tải dữ liệu", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenseRequests()
  }, [filterStatus, effectiveRole])

  // Tính toán thống kê
  const totalPending = expenseRequests.filter((r) => r.status === "pending").length
  const totalApproved = expenseRequests.filter((r) => r.status === "approved").length
  const totalRejected = expenseRequests.filter((r) => r.status === "rejected").length
  const totalAmount = expenseRequests.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.amount, 0)

  // Lọc yêu cầu
  const filteredRequests = expenseRequests.filter((request) => {
    const matchesSearch =
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || request.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleCreateExpenseRequest = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);

      // Upload files first and get metadata
      const uploadedMetas = await uploadSelectedFiles(newRequestFiles)

      const payload = {
        employee_id: currentUserId,
        description: newRequest.description,
        amount: Number(newRequest.amount),
        date: newRequest.date,
        notes: newRequest.notes || undefined,
        file_attachments: uploadedMetas,
      }
      console.log("Tạo yêu cầu chi phí:", payload)
      const result = await expenseRequestService.createExpenseRequest(payload as any)
      if (result.data) {
        toast({ title: "Thành công", description: "Đã tạo yêu cầu chi phí thành công" })
        fetchExpenseRequests()
        setIsAddDialogOpen(false)
        setNewRequest({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          notes: "",
        })
        setNewRequestFiles([])
      } else {
        console.error("Lỗi tạo yêu cầu chi phí:", result?.error)
        toast({ title: "Lỗi", description: result.error || "Không thể tạo yêu cầu chi phí", variant: "destructive" })
      }
    } catch (error) {
      console.error("Lỗi tạo yêu cầu chi phí:", error)
      toast({ title: "Lỗi", description: "Đã có lỗi xảy ra", variant: "destructive" })
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper function to flatten budget categories for display
  const flattenCategories = (categories: any[]): any[] => {
    const result: any[] = []
    
    if (!Array.isArray(categories)) {
      return []
    }
    
    const flatten = (cats: any[], level: number = 0) => {
      cats.forEach(cat => {
        if (cat && cat.id && cat.code && cat.name) {
          result.push({
            ...cat,
            displayName: `${'  '.repeat(level)}${cat.code} - ${cat.name}`,
            level
          })
          if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
            flatten(cat.children, level + 1)
          }
        }
      })
    }
    
    flatten(categories)
    return result
  }

  // Helper function to automatically create financial transaction when expense is approved
  const createFinancialTransactionFromExpense = async (expense: ExpenseRequest, budgetCategoryId?: string) => {
    try {
      const transactionData = {
        transaction_type: 'expense', // Always expense for expense requests
        category_id: budgetCategoryId || null, // Can be null if no category selected
        description: `Chi phí: ${expense.description}`,
        amount: expense.amount,
        date: expense.date,
        account_type: 'company', // Default to company account
        notes: `Tự động tạo từ yêu cầu chi phí #${expense.id.slice(0, 8)} - ${expense.employee?.name || 'Nhân viên'}`,
      }
      
      console.log('🔄 Creating financial transaction from expense:', transactionData);
      const result = await financialsService.createTransaction(transactionData);
      
      if (result.data) {
        console.log('✅ Financial transaction created successfully');
        return result.data;
      } else {
        console.error('❌ Failed to create financial transaction:', result.error);
        throw new Error(result.error || 'Không thể tạo giao dịch tài chính');
      }
    } catch (error) {
      console.error('❌ Error creating financial transaction:', error);
      throw error;
    }
  }

  const openApprovalDialog = (id: string) => {
    const request = expenseRequests.find(req => req.id === id);
    if (request) {
      setApprovingRequest(request);
      // Initialize with the expense request's category if it matches a budget category
      const matchingBudgetCategory = budgetCategories.find(cat => 
        cat.name === request.category || cat.code === request.category
      );
      setSelectedApprovalBudgetCategory(matchingBudgetCategory?.id || "none");
      setIsApprovalDialogOpen(true);
    }
  }

  const handleApprove = async () => {
    if (!approvingRequest) return;
    
    try {
      setIsApproving(true);
      
      // First, approve the expense request
      const result = await expenseRequestService.approveExpenseRequest(approvingRequest.id)
      if (result.data) {
        // After approval, automatically integrate with financial system
        if (selectedApprovalBudgetCategory !== "none") {
          // Show integration dialog with pre-selected budget category
          setIntegratingRequest(approvingRequest);
          setSelectedBudgetCategory(selectedApprovalBudgetCategory);
          setIsIntegrateDialogOpen(true);
          toast({ title: "Thành công", description: "Đã duyệt yêu cầu chi phí" })
        } else {
          toast({ title: "Thành công", description: "Đã duyệt yêu cầu chi phí" })
          fetchExpenseRequests()
        }
        setIsApprovalDialogOpen(false);
        setApprovingRequest(null);
        setSelectedApprovalBudgetCategory("none");
      } else {
        toast({ title: "Lỗi", description: result.error || "Không thể duyệt yêu cầu", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Đã có lỗi xảy ra", variant: "destructive" })
    } finally {
      setIsApproving(false);
    }
  }

  const handleReject = async (id: string, reason: string) => {
    // Prevent duplicate submissions
    if (rejectingRequestIdForLoading === id) return;
    
    try {
      setRejectingRequestIdForLoading(id);
      const result = await expenseRequestService.rejectExpenseRequest(id, reason)
      if (result.data) {
        toast({ title: "Thành công", description: "Đã từ chối yêu cầu chi phí" })
        fetchExpenseRequests()
        setIsRejectDialogOpen(false)
        setRejectionReason("")
        setRejectingRequestId("")
      } else {
        toast({ title: "Lỗi", description: result.error || "Không thể từ chối yêu cầu", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Đã có lỗi xảy ra", variant: "destructive" })
    } finally {
      setRejectingRequestIdForLoading("");
    }
  }

  const openRejectDialog = (requestId: string) => {
    setRejectingRequestId(requestId)
    setIsRejectDialogOpen(true)
  }

  const openCreateDialog = () => {
    // Reset form to empty state
    setNewRequest({
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    })
    setIsAddDialogOpen(true)
  }

  // Handle integration with financial system
  const handleIntegrateWithFinancial = async () => {
    if (!integratingRequest) {
      toast({ title: "Lỗi", description: "Không tìm thấy yêu cầu chi phí", variant: "destructive" })
      return
    }

    if (selectedBudgetCategory === "none") {
      toast({ title: "Lỗi", description: "Vui lòng chọn danh mục ngân sách", variant: "destructive" })
      return
    }

    try {
      setIsIntegrating(true);
      
      // Gọi API để liên kết expense với financial transaction
      const response = await fetch('/api/expense-requests/link-financial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          expense_request_id: integratingRequest.id,
          budget_category_id: selectedBudgetCategory
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({ 
          title: "Thành công", 
          description: `Đã liên kết chi phí "${integratingRequest.description}" với hệ thống tài chính` 
        })
        
        // Close dialog and refresh data
        setIsIntegrateDialogOpen(false);
        setIntegratingRequest(null);
        setSelectedBudgetCategory("none");
        fetchExpenseRequests();
      } else {
        if (result.code === 'ALREADY_MAPPED') {
          toast({
            title: "Đã liên kết",
            description: "Chi phí này đã được liên kết với hệ thống tài chính rồi",
            variant: "default"
          });
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      }
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra";
      toast({ title: "Lỗi", description: msg, variant: "destructive" })
    } finally {
      setIsIntegrating(false);
    }
  }

  const viewRequestDetail = (request: ExpenseRequest) => {
    setSelectedRequest(request)
    setIsDetailDialogOpen(true)
  }

  const openEditDialog = (request: ExpenseRequest) => {
    setSelectedRequest(request)
    setEditRequest({
      description: request.description,
      amount: request.amount.toString(),
      date: request.date,
      notes: request.notes || "",
    })
    setEditRequestFiles([])
    setExistingEditAttachments([...(request.file_attachments || [])])
    setIsEditDialogOpen(true)
  }

  const openIntegrateDialog = (request: ExpenseRequest) => {
    setIntegratingRequest(request)
    // Initialize with the expense request's category if it matches a budget category
    const matchingBudgetCategory = budgetCategories.find(cat => 
      cat.name === request.category || cat.code === request.category
    );
    setSelectedBudgetCategory(matchingBudgetCategory?.id || "none")
    setIsIntegrateDialogOpen(true)
  }

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return
    
    try {
      // Upload any newly selected files
      const uploadedMetas = await uploadSelectedFiles(editRequestFiles)
      const mergedFileAttachments = [
        ...existingEditAttachments,
        ...uploadedMetas,
      ]

      const payload = {
        description: editRequest.description,
        amount: Number(editRequest.amount),
        date: editRequest.date,
        notes: editRequest.notes || undefined,
        file_attachments: mergedFileAttachments,
      }
      console.log("Cập nhật yêu cầu chi phí:", payload)
      
      const result = await expenseRequestService.updateExpenseRequest(selectedRequest.id, payload)
      if (result.data) {
        toast({ title: "Thành công", description: "Đã cập nhật yêu cầu chi phí thành công" })
        fetchExpenseRequests()
        setIsEditDialogOpen(false)
        setSelectedRequest(null)
        setEditRequest({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          notes: "",
        })
         setEditRequestFiles([])
         setExistingEditAttachments([])
      } else {
        console.error("Lỗi cập nhật yêu cầu chi phí:", result?.error)
        toast({ title: "Lỗi", description: result.error || "Không thể cập nhật yêu cầu chi phí", variant: "destructive" })
      }
    } catch (error) {
      console.error("Lỗi cập nhật yêu cầu chi phí:", error)
      toast({ title: "Lỗi", description: "Đã có lỗi xảy ra", variant: "destructive" })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            Đã duyệt
          </Badge>
        )
      case "pending":
        return <Badge variant="secondary">Chờ duyệt</Badge>
      case "rejected":
        return <Badge variant="destructive">Từ chối</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  // When opening detail dialog, prepare signed URLs for private files
  useEffect(() => {
    const prepareSignedUrls = async () => {
      if (!isDetailDialogOpen || !selectedRequest?.file_attachments) return
      const storagePaths = (selectedRequest.file_attachments || [])
        .map(att => att.storage_path)
        .filter(Boolean) as string[]
      if (storagePaths.length === 0) {
        setAttachmentLinks({})
        return
      }

      try {
        const res = await fetch('/api/storage/expense-attachments/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: storagePaths })
        })
        const json = await res.json()
        const links: Record<string, string> = {}
        for (const att of selectedRequest.file_attachments || []) {
          const key = att.id || att.storage_path || att.file_name
          const url = att.storage_path ? json.urls?.[att.storage_path] : undefined
          if (key && url) links[key] = url
        }
        setAttachmentLinks(links)
      } catch (e) {
        console.error('Failed to get signed urls', e)
        setAttachmentLinks({})
      }
    }
    prepareSignedUrls()
  }, [isDetailDialogOpen, selectedRequest])

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Xin cấp chi phí</h2>
          <p className="text-muted-foreground">
            {effectiveRole === "Employee" && "Tạo và theo dõi yêu cầu chi phí của bạn"}
            {(effectiveRole === "HR" || effectiveRole === "Accountant") && "Duyệt yêu cầu chi phí và quản lý chi phí của bạn"}
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo yêu cầu mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tạo yêu cầu chi phí</DialogTitle>
              <DialogDescription>Nhập thông tin chi phí cần được phê duyệt</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Ngày phát sinh</Label>
                <Input
                  id="date"
                  type="date"
                  value={newRequest.date}
                  onChange={(e) => setNewRequest({...newRequest, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả chi phí</Label>
                <Input 
                  id="description" 
                  placeholder="Nhập mô tả chi tiết" 
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền (VNĐ)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="0" 
                  value={newRequest.amount}
                  onChange={(e) => setNewRequest({...newRequest, amount: e.target.value})}
                  required 
                  min="0" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Ghi chú thêm (tùy chọn)" 
                  rows={3}
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Đính kèm hóa đơn</Label>
                <ExpenseAttachmentUpload
                  files={newRequestFiles}
                  onChange={setNewRequestFiles}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button 
                onClick={handleCreateExpenseRequest}
                disabled={isSubmitting || !newRequest.description || !newRequest.amount || !newRequest.date}
              >
                {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employee Balance Display - Better positioned */}
      {effectiveRole === "Employee" && employeeBalance && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Số dư chi phí của bạn
            </CardTitle>
            <CardDescription>
              Theo dõi số dư và chi phí đã sử dụng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-center mb-2">
                  {employeeBalance.current_balance > 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : employeeBalance.current_balance < 0 ? (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  ) : (
                    <Wallet className="h-6 w-6 text-gray-600" />
                  )}
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  employeeBalance.current_balance > 0 ? 'text-green-600' :
                  employeeBalance.current_balance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formatCurrency(employeeBalance.current_balance)}
                </div>
                <div className="text-sm text-green-700 font-medium">Số dư hiện tại</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {formatCurrency(employeeBalance.total_received)}
                </div>
                <div className="text-sm text-blue-700 font-medium">Tổng đã nhận</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-center mb-2">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {formatCurrency(employeeBalance.total_spent)}
                </div>
                <div className="text-sm text-orange-700 font-medium">Tổng đã chi</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thông báo tích hợp với Financial System */}
      {(effectiveRole === "HR" || effectiveRole === "Accountant") && (
        <div className="mb-4">
          <Alert className="border-blue-200 bg-blue-50">
            <LinkIcon className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Tích hợp với Hệ thống Tài chính</AlertTitle>
            <AlertDescription className="text-blue-700">
              Khi duyệt yêu cầu chi phí, hệ thống sẽ tự động tạo giao dịch tài chính và cập nhật dự toán ngân sách. 
              Sử dụng nút <LinkIcon className="inline h-3 w-3" /> để tích hợp thủ công các yêu cầu đã duyệt.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Thống kê tổng quan */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Yêu cầu cần xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
            <p className="text-xs text-muted-foreground">Yêu cầu được chấp nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalRejected}</div>
            <p className="text-xs text-muted-foreground">Yêu cầu bị từ chối</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Đã được phê duyệt</p>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách yêu cầu */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách yêu cầu chi phí</CardTitle>
          <CardDescription>Quản lý các yêu cầu chi phí từ nhân viên</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm yêu cầu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {getStatusIcon(request.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{request.description}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">{request.employee?.name}</span>
                        <span className="mx-2">•</span>
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">{request.category}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(request.date).toLocaleDateString("vi-VN")}</span>
                      </div>
                      {request.notes && (
                        <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 rounded border-l-2 border-gray-200">
                          {request.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 lg:ml-4">
                    {/* Part 1: Amount and Date Section */}
                    <div className="text-right min-w-[140px] max-w-[200px] flex-shrink-0">
                      <div className="font-bold text-lg text-red-600 break-all leading-tight">{formatCurrency(request.amount)}</div>
                      <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                        Gửi: {new Date(request.submitted_date).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    
                    {/* Part 2: Status Badge */}
                    <div className="min-w-[100px] flex justify-center">
                      {getStatusBadge(request.status)}
                    </div>
                    
                    {/* Part 3: Action Menu */}
                    <div className="flex justify-center">
                      <DropdownMenu
                        open={openDropdownId === request.id}
                        onOpenChange={(open) => setOpenDropdownId(open ? request.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {request.status === "pending" && (effectiveRole === "HR" || effectiveRole === "Accountant") && (
                            <DropdownMenuItem onClick={() => { openApprovalDialog(request.id); setOpenDropdownId(null); }}>
                              <CheckCircle className="h-4 w-4" /> Duyệt
                            </DropdownMenuItem>
                          )}
                          {request.status === "pending" && (effectiveRole === "HR" || effectiveRole === "Accountant") && (
                            <DropdownMenuItem onClick={() => { openRejectDialog(request.id); setOpenDropdownId(null); }}>
                              <XCircle className="h-4 w-4" /> Từ chối
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { viewRequestDetail(request); setOpenDropdownId(null); }}>
                            <Eye className="h-4 w-4" /> Xem
                          </DropdownMenuItem>
                          {request.status === "pending" && request.employee_id === currentUserId && (
                            <DropdownMenuItem onClick={() => { openEditDialog(request); setOpenDropdownId(null); }}>
                              <Edit className="h-4 w-4" /> Sửa
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">Không tìm thấy yêu cầu nào phù hợp</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nhập lý do từ chối</DialogTitle>
            <DialogDescription>Vui lòng nhập lý do từ chối yêu cầu chi phí</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              id="rejectionReason"
              placeholder="Nhập lý do từ chối..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={rejectingRequestIdForLoading === rejectingRequestId}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                handleReject(rejectingRequestId, rejectionReason)
              }}
              disabled={rejectingRequestIdForLoading === rejectingRequestId || !rejectionReason.trim()}
            >
              {rejectingRequestIdForLoading === rejectingRequestId ? "Đang từ chối..." : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                    {selectedRequest.employee?.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2) || "NV"}
                  </div>
                  <div>
                    <div className="text-xl">Yêu cầu chi phí #{selectedRequest.id}</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      {selectedRequest.employee?.name} • {selectedRequest.employee?.employee_code}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
                {/* Request Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Thông tin chi phí</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Danh mục:</span>
                        <Badge variant="outline">{selectedRequest.category}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Số tiền:</span>
                        <span className="font-bold text-red-600">{formatCurrency(selectedRequest.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ngày phát sinh:</span>
                        <span className="font-medium">
                          {new Date(selectedRequest.date).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ngày gửi:</span>
                        <span className="font-medium">
                          {new Date(selectedRequest.submitted_date).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Trạng thái xử lý</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Trạng thái:</span>
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                      {selectedRequest.approved_by_employee && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Người duyệt:</span>
                          <span className="font-medium">{selectedRequest.approved_by_employee.name}</span>
                        </div>
                      )}
                      {selectedRequest.approved_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Ngày duyệt:</span>
                          <span className="font-medium">
                            {new Date(selectedRequest.approved_date).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      )}
                      {selectedRequest.rejected_by_employee && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Người từ chối:</span>
                          <span className="font-medium">{selectedRequest.rejected_by_employee.name}</span>
                        </div>
                      )}
                      {selectedRequest.rejected_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Ngày từ chối:</span>
                          <span className="font-medium">
                            {new Date(selectedRequest.rejected_date).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Description and Notes */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Mô tả chi phí:</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm break-words">{selectedRequest.description}</div>
                  </div>

                  {selectedRequest.notes && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Ghi chú:</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm break-words">{selectedRequest.notes}</div>
                    </div>
                  )}

                  {selectedRequest.rejection_reason && (
                    <div>
                      <Label className="text-sm font-medium text-red-700">Lý do từ chối:</Label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 break-words">
                        {selectedRequest.rejection_reason}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tệp đính kèm:</Label>
                    <div className="mt-2 space-y-2">
                      {/* New JSON attachments */}
                      {(selectedRequest.file_attachments && selectedRequest.file_attachments.length > 0) ? (
                        selectedRequest.file_attachments.map((att) => {
                          const key = att.id || att.storage_path || att.file_name
                          const url = key ? attachmentLinks[key] : undefined
                          return (
                            <div key={key} className="flex items-center justify-between rounded border p-3 hover:bg-gray-50">
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="text-sm font-medium truncate" title={att.file_name}>
                                  {att.file_name}
                                </div>
                                {att.file_size && (
                                  <div className="text-xs text-muted-foreground">
                                    {(att.file_size / 1024).toFixed(1)} KB
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {url ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="secondary">Xem</Button>
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Đang tạo link...</span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        // Legacy attachments (string URLs)
                        (selectedRequest.attachments && selectedRequest.attachments.length > 0) ? (
                          selectedRequest.attachments.map((url) => (
                            <div key={url} className="flex items-center justify-between rounded border p-3 hover:bg-gray-50">
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="text-sm truncate" title={url}>{url}</div>
                              </div>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                <Button size="sm" variant="secondary">Xem</Button>
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">Chưa có tệp đính kèm</div>
                        )
                      )}
                    </div>
                  </div>
                </div>


              </div>

              {/* Approval Actions - Fixed at bottom */}
              {(effectiveRole === "HR" || effectiveRole === "Accountant") &&
                selectedRequest.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t bg-white">
                    <Button
                      onClick={() => {
                        openApprovalDialog(selectedRequest.id)
                        setIsDetailDialogOpen(false)
                      }}
                      className="flex-1"
                      disabled={approvingRequestId === selectedRequest.id}
                    >
                      {approvingRequestId === selectedRequest.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Phê duyệt
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        openRejectDialog(selectedRequest.id)
                        setIsDetailDialogOpen(false)
                      }}
                      className="flex-1"
                      disabled={rejectingRequestIdForLoading === selectedRequest.id}
                    >
                      {rejectingRequestIdForLoading === selectedRequest.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Từ chối
                    </Button>
                  </div>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa yêu cầu chi phí</DialogTitle>
            <DialogDescription>Cập nhật thông tin yêu cầu chi phí</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Ngày phát sinh</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editRequest.date}
                  onChange={(e) => setEditRequest({...editRequest, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Số tiền (VNĐ)</Label>
                <Input 
                  id="edit-amount" 
                  type="number" 
                  placeholder="0" 
                  value={editRequest.amount}
                  onChange={(e) => setEditRequest({...editRequest, amount: e.target.value})}
                  required 
                  min="0" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả chi phí</Label>
              <Input 
                id="edit-description" 
                placeholder="Nhập mô tả chi tiết" 
                value={editRequest.description}
                onChange={(e) => setEditRequest({...editRequest, description: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Ghi chú</Label>
              <Textarea 
                id="edit-notes" 
                placeholder="Ghi chú thêm (tùy chọn)" 
                rows={3}
                value={editRequest.notes}
                onChange={(e) => setEditRequest({...editRequest, notes: e.target.value})}
              />
            </div>

            {/* Edit attachments */}
            <div className="space-y-2">
              <Label>Đính kèm hóa đơn</Label>
              {/* Existing attachments with remove buttons */}
              {existingEditAttachments && existingEditAttachments.length > 0 && (
                <div className="space-y-2">
                  {existingEditAttachments.map((att, idx) => (
                    <div key={att.id || att.storage_path || att.file_name} className="flex items-center justify-between rounded border p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate max-w-[220px]" title={att.file_name}>{att.file_name}</span>
                        {att.file_size && (
                          <span className="text-xs text-muted-foreground">{(att.file_size / 1024).toFixed(0)} KB</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => {
                          const next = [...existingEditAttachments]
                          next.splice(idx, 1)
                          setExistingEditAttachments(next)
                        }}
                        title="Xóa"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <ExpenseAttachmentUpload
                files={editRequestFiles}
                onChange={setEditRequestFiles}
                disabled={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
            }}>
              Hủy
            </Button>
            <Button onClick={handleUpdateRequest}>
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integrate with Financial Dialog */}
      <Dialog open={isIntegrateDialogOpen} onOpenChange={setIsIntegrateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <LinkIcon className="w-5 h-5" />
              <span>Tích hợp với Hệ thống Tài chính</span>
            </DialogTitle>
            <DialogDescription>
              Tích hợp yêu cầu chi phí đã duyệt với hệ thống quản lý tài chính và ngân sách
            </DialogDescription>
          </DialogHeader>
          
          {integratingRequest && (
            <div className="space-y-4">
              {/* Expense Info */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Thông tin yêu cầu chi phí</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Mô tả:</strong> {integratingRequest.description}</div>
                  <div><strong>Số tiền:</strong> {formatCurrency(integratingRequest.amount)}</div>
                  <div><strong>Danh mục:</strong> {integratingRequest.category}</div>
                  <div><strong>Nhân viên:</strong> {integratingRequest.employee?.name}</div>
                </div>
              </div>

              {/* Budget Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="budget_category">Danh mục Ngân sách (tùy chọn)</Label>
                <Select value={selectedBudgetCategory} onValueChange={setSelectedBudgetCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục ngân sách để theo dõi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn danh mục</SelectItem>
                    {budgetCategories.length > 0 ? (
                      flattenCategories(budgetCategories).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Đang tải danh mục...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Chọn danh mục ngân sách để theo dõi chi phí này trong hệ thống ngân sách chi tiết
                </p>
              </div>

              {/* Integration Actions */}
              <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                <h4 className="font-medium text-blue-800 mb-2">Tích hợp sẽ thực hiện:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Tạo giao dịch tài chính tự động trong hệ thống</li>
                  <li>• Cập nhật số liệu chi phí thực tế</li>
                  <li>• Liên kết với danh mục ngân sách (nếu được chọn)</li>
                  <li>• Theo dõi tiến độ sử dụng ngân sách</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIntegrateDialogOpen(false)} disabled={isIntegrating}>
              Hủy
            </Button>
            <Button onClick={handleIntegrateWithFinancial} disabled={isIntegrating}>
              {isIntegrating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang tích hợp...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>Tích hợp ngay</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog with Budget Category Selection */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Duyệt Yêu cầu Chi phí</span>
            </DialogTitle>
            <DialogDescription>
              Duyệt yêu cầu chi phí và chọn danh mục ngân sách (tùy chọn)
            </DialogDescription>
          </DialogHeader>
          
          {approvingRequest && (
            <div className="space-y-4">
              {/* Expense Info */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Thông tin yêu cầu chi phí</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Mô tả:</strong> {approvingRequest.description}</div>
                  <div><strong>Số tiền:</strong> {formatCurrency(approvingRequest.amount)}</div>
                  <div><strong>Danh mục:</strong> {approvingRequest.category}</div>
                  <div><strong>Nhân viên:</strong> {approvingRequest.employee?.name}</div>
                </div>
              </div>

              {/* Budget Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="approval_budget_category">Danh mục Ngân sách (tùy chọn)</Label>
                <Select value={selectedApprovalBudgetCategory} onValueChange={setSelectedApprovalBudgetCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục ngân sách để theo dõi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn danh mục</SelectItem>
                    {budgetCategories.length > 0 ? (
                      flattenCategories(budgetCategories).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Đang tải danh mục...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Chọn danh mục ngân sách để theo dõi chi phí này trong hệ thống ngân sách chi tiết
                </p>
              </div>

              {/* Integration Actions */}
              <div className="p-4 border-l-4 border-green-500 bg-green-50">
                <h4 className="font-medium text-green-800 mb-2">Quy trình duyệt:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Duyệt yêu cầu chi phí</li>
                  <li>• Tự động tích hợp với hệ thống tài chính (nếu chọn danh mục ngân sách)</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsApprovalDialogOpen(false);
              setApprovingRequest(null);
              setSelectedApprovalBudgetCategory("none");
              setIsApproving(false);
            }}>
              Hủy
            </Button>
            <Button 
              onClick={() => handleApprove()} 
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang duyệt...</span>
                </div>
              ) : (
                "Duyệt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
