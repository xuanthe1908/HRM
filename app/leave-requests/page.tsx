"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Eye, FileText, Search, Loader2, MoreVertical, Settings2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { leaveRequestService, leaveBalanceService } from "@/lib/services"
import type { LeaveRequest } from "@/types/leave-request"
// Replaced toast utility with inline message rendering
import { 
  mapDatabaseRoleToUI, 
  hasAdminAccess,
  type DatabaseRole,
  type UIRole 
} from "@/lib/role-types"
import { useCookies } from "@/hooks/use-cookies"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

// Map hiển thị -> code để gửi lên API khi tạo đơn
const leaveTypeMap: Record<string, string> = {
  "Nghỉ phép năm": "annual_leave",
  "Nghỉ ốm": "sick_leave",
  "Nghỉ việc riêng": "personal_leave",
  "Nghỉ thai sản": "maternity_leave",
  "Nghỉ không lương": "unpaid_leave",
  "Nghỉ nửa ngày": "half_day",
  "Khác": "other",
}

// Map code -> nhãn tiếng Việt để hiển thị trong UI
const leaveTypeLabel: Record<string, string> = {
  annual_leave: "Nghỉ phép năm",
  sick_leave: "Nghỉ ốm",
  personal_leave: "Nghỉ việc riêng",
  maternity_leave: "Nghỉ thai sản",
  unpaid_leave: "Nghỉ không lương",
  half_day: "Nghỉ nửa ngày",
  other: "Khác",
}

const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
}

// Helpers to show per-type balances in the dropdown
type LeaveTypeCode = 'annual_leave' | 'sick_leave' | 'personal_leave' | 'maternity_leave' | 'unpaid_leave' | 'half_day' | 'other'

const allLeaveTypeCodes: LeaveTypeCode[] = [
  'annual_leave',
  'sick_leave',
  'personal_leave',
  'maternity_leave',
  'unpaid_leave',
  'half_day',
  'other',
]

function getTypeBalanceLabel(code: LeaveTypeCode, balance: any | null): string {
  if (!balance) return leaveTypeLabel[code]

  // Map balance fields
  const totals: Record<string, number> = {
    annual_leave_total: balance.annual_leave_total ?? 0,
    sick_leave_total: balance.sick_leave_total ?? 0,
    personal_leave_total: balance.personal_leave_total ?? 0,
    maternity_leave_total: balance.maternity_leave_total ?? 0,
  }
  const used: Record<string, number> = {
    annual_leave_used: balance.annual_leave_used ?? 0,
    sick_leave_used: balance.sick_leave_used ?? 0,
    personal_leave_used: balance.personal_leave_used ?? 0,
    maternity_leave_used: balance.maternity_leave_used ?? 0,
  }

  let total = 0
  let remaining = 0

  switch (code) {
    case 'annual_leave':
    case 'half_day': // half-day consumes annual leave
      total = totals.annual_leave_total
      remaining = Math.max(0, (totals.annual_leave_total - used.annual_leave_used))
      break
    case 'sick_leave':
      total = totals.sick_leave_total
      remaining = Math.max(0, (totals.sick_leave_total - used.sick_leave_used))
      break
    case 'personal_leave':
      total = totals.personal_leave_total
      remaining = Math.max(0, (totals.personal_leave_total - used.personal_leave_used))
      break
    case 'maternity_leave':
      total = totals.maternity_leave_total
      remaining = Math.max(0, (totals.maternity_leave_total - used.maternity_leave_used))
      break
    case 'unpaid_leave':
    case 'other':
      total = 0
      remaining = 0
      break
  }

  return `${leaveTypeLabel[code]} (${remaining} còn lại / ${total} ngày)`
}

const leaveTypeDescriptions: Record<LeaveTypeCode, { title: string; bullets: string[]; deductsAnnual: boolean }> = {
  annual_leave: {
    title: 'Nghỉ phép năm',
    bullets: [
      'Tích lũy hằng tháng theo chính sách công ty',
      'Cần gửi đơn trước để được duyệt',
      'Trừ vào số ngày phép còn lại',
    ],
    deductsAnnual: true,
  },
  sick_leave: {
    title: 'Nghỉ ốm',
    bullets: [
      'Phép ốm dùng khi bạn nghỉ do lý do sức khỏe.',
      'Có thể yêu cầu giấy tờ xác nhận tùy trường hợp',
      'Không trừ phép năm',
    ],
    deductsAnnual: false,
  },
  personal_leave: {
    title: 'Nghỉ việc riêng',
    bullets: [
      'Dùng cho việc riêng, gia đình',
      'Có thể cần người quản lý phê duyệt',
      'Không trừ phép năm (tùy chính sách)',
    ],
    deductsAnnual: false,
  },
  maternity_leave: {
    title: 'Nghỉ thai sản',
    bullets: [
      'Theo đúng quy định pháp luật và chính sách công ty',
      'Không trừ phép năm',
    ],
    deductsAnnual: false,
  },
  unpaid_leave: {
    title: 'Nghỉ không lương',
    bullets: [
      'Khi đã dùng hết các loại phép khác hoặc theo nhu cầu',
      'Cần được quản lý phê duyệt',
      'Không trừ phép năm',
    ],
    deductsAnnual: false,
  },
  half_day: {
    title: 'Nghỉ nửa ngày',
    bullets: [
      'Nghỉ một buổi (sáng/chiều)',
      'Có thể chọn giờ bắt đầu/kết thúc',
      'Trừ 0.5 ngày phép năm',
    ],
    deductsAnnual: true,
  },
  other: {
    title: 'Khác',
    bullets: [
      'Trường hợp đặc biệt theo thỏa thuận',
      'Có thể yêu cầu chọn giờ bắt đầu/kết thúc',
      'Không trừ phép năm (trừ khi quy định khác)',
    ],
    deductsAnnual: false,
  },
}

export default function LeaveRequestsPage() {
  const { formatCurrency } = useLanguage()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Check if this is personal view (from query or dedicated routes)
  const isPersonalView =
    searchParams.get('view') === 'personal' ||
    pathname === '/leave-requests/personal' ||
    pathname === '/my-leave-requests'

  // Map database role to UI role using centralized function
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
    // If HR/Admin user is in personal view, treat them as Employee
    if ((userRole === "HR" || isAdmin()) && isPersonalView) {
      return "Employee"
    }
    return userRole
  }
  
  const effectiveRole = getEffectiveRole()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all") // values: all | pending | approved | rejected
  const [typeFilter, setTypeFilter] = useState<string>("all") // values: all | annual_leave | ...
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  // Toasts are used instead of inline form messages
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvingIdForDialog, setApprovingIdForDialog] = useState<string>("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null)
  const [editDraft, setEditDraft] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
    notes: "",
  })

  // New leave request form state
  const [newRequest, setNewRequest] = useState({
    leaveType: "", // giữ nhãn tiếng Việt ở UI tạo đơn, khi gửi sẽ map sang code
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
    notes: "",
  })

  const currentUserId = user?.id || ""
  const [currentUserBalance, setCurrentUserBalance] = useState<any>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  // Reject dialog state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<string>("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [approvingRequestId, setApprovingRequestId] = useState<string>("")
  const [rejectingRequestIdForLoading, setRejectingRequestIdForLoading] = useState<string>("")
  const [visibleColumns, setVisibleColumns] = useCookies<Record<string, boolean>>("leave_requests_table_columns", {
    employee: true,
    leaveType: true,
    timeRange: true,
    days: true,
    reason: true,
    status: true,
    approver: true,
    actions: true,
  })
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [isLeaveInfoSheetOpen, setIsLeaveInfoSheetOpen] = useState(false)
  const isMobile = useIsMobile()

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      const filters: any = {}
      if (statusFilter !== "all") filters.status = statusFilter // snake_case/naming theo API
      if (typeFilter !== "all") filters.leave_type = typeFilter
      if (effectiveRole === "Employee" || effectiveRole === "Accountant") filters.employee_id = currentUserId

      const result = await leaveRequestService.getLeaveRequests(filters)
      if (result?.data) {
        setLeaveRequests(result.data)
      } else {
        toast({ title: 'Lỗi', description: 'Không thể tải danh sách đơn nghỉ phép', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Đã có lỗi xảy ra khi tải dữ liệu', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaveRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, effectiveRole, currentUserId])

  useEffect(() => {
    const fetchBalance = async () => {
      setBalanceLoading(true)
      const res = await leaveBalanceService.getCurrentEmployeeLeaveBalance()
      if (res?.data) setCurrentUserBalance(res.data)
      setBalanceLoading(false)
    }
    if (currentUserId) fetchBalance()
  }, [currentUserId])

  // Client-side filter bổ sung để UI luôn đúng ngay cả khi API chưa áp filter
  const getFilteredRequests = () => {
    let filtered = [...leaveRequests]

    // Role-based filtering
    if (effectiveRole === "Employee") {
      // Employee and Accountant see only their own requests
      filtered = filtered.filter((req) => req.employee_id === currentUserId)
    } else if (effectiveRole === "HR") {
      // HR/Admin see all requests
      // no-op
    } else if (effectiveRole === "Accountant") {
      // Accountant sees only their own requests
      filtered = filtered.filter((req) => req.employee_id === currentUserId)
    }

    // Status/type filters (code)
    if (statusFilter !== "all") filtered = filtered.filter((r) => r.status === statusFilter)
    if (typeFilter !== "all") filtered = filtered.filter((r) => r.leave_type === typeFilter)

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (req) =>
          req.employee?.name?.toLowerCase().includes(q) ||
          req.employee?.employee_code?.toLowerCase().includes(q) ||
          req.reason?.toLowerCase().includes(q),
      )
    }

    return filtered
  }

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 tính cả ngày bắt đầu
    return diffDays
  }

  // Tránh lệch ngày do timezone — input type=date đã là YYYY-MM-DD
  const toISODate = (dateStr: string) => dateStr

  const handleCreateRequest = async () => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)

      // Validate required fields
      if (!newRequest.leaveType || !newRequest.startDate || !newRequest.endDate || !newRequest.reason) {
        toast({ title: 'Lỗi', description: 'Vui lòng điền đầy đủ thông tin bắt buộc', variant: 'destructive' })
        return
      }

      // Date order validation
      const sd = new Date(newRequest.startDate)
      const ed = new Date(newRequest.endDate)
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        toast({ title: 'Lỗi', description: 'Ngày bắt đầu/kết thúc không hợp lệ', variant: 'destructive' })
        return
      }
      if (sd.getTime() > ed.getTime()) {
        toast({ title: 'Lỗi', description: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc', variant: 'destructive' })
        return
      }

      // Time validation for types that require time fields
      const requiresTime = newRequest.leaveType === 'half_day' || newRequest.leaveType === 'other'
      if (requiresTime) {
        if (!newRequest.startTime || !newRequest.endTime) {
          toast({ title: 'Lỗi', description: 'Vui lòng nhập giờ bắt đầu và giờ kết thúc', variant: 'destructive' })
          return
        }
        const [sh, sm] = newRequest.startTime.split(':').map(Number)
        const [eh, em] = newRequest.endTime.split(':').map(Number)
        if (
          Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)
        ) {
          toast({ title: 'Lỗi', description: 'Định dạng giờ không hợp lệ', variant: 'destructive' })
          return
        }
        const startMins = sh * 60 + sm
        const endMins = eh * 60 + em
        if (newRequest.startDate === newRequest.endDate && endMins <= startMins) {
          toast({ title: 'Lỗi', description: 'Giờ kết thúc phải lớn hơn giờ bắt đầu', variant: 'destructive' })
          return
        }
      }

      // Compute total days
      let requestedDays = calculateDays(newRequest.startDate, newRequest.endDate)
      if (newRequest.leaveType === "half_day") {
        requestedDays = 0.5
      } else if (newRequest.leaveType === "other" && newRequest.startTime && newRequest.endTime) {
        // If times provided for "Khác", derive fractional days based on 8h/day
        const [sh, sm] = newRequest.startTime.split(":").map(Number)
        const [eh, em] = newRequest.endTime.split(":").map(Number)
        const startMins = sh * 60 + sm
        const endMins = eh * 60 + em
        const diffHours = Math.max(0, (endMins - startMins) / 60)
        const workDayHours = 8
        const fractional = diffHours / workDayHours
        // If same day range, override requestedDays; otherwise keep date-based + fractional? For simplicity, if single-day, use fractional, else keep date-based.
        if (newRequest.startDate === newRequest.endDate && fractional > 0) {
          requestedDays = Math.min(requestedDays, fractional)
        }
      }

      // Check annual leave balance
      if (newRequest.leaveType === "annual_leave" && currentUserBalance) {
        if (!currentUserBalance.official_start_date) {
          toast({ title: 'Lỗi', description: 'Bạn chưa có ngày bắt đầu chính thức nên không thể xin nghỉ phép năm', variant: 'destructive' })
          return
        }

        if (currentUserBalance.remaining_days < requestedDays) {
          toast({ title: 'Lỗi', description: `Bạn chỉ còn ${currentUserBalance.remaining_days} ngày nghỉ phép, không thể xin nghỉ ${requestedDays} ngày`, variant: 'destructive' })
          return
        }

        if (requestedDays > currentUserBalance.remaining_days * 0.5) {
          const confirmUse = window.confirm(
            `Bạn đang xin nghỉ ${requestedDays} ngày, sau khi nghỉ sẽ còn ${currentUserBalance.remaining_days - requestedDays} ngày. Bạn có chắc chắn muốn tiếp tục?`,
          )
          if (!confirmUse) return
        }
      }

      const payload = {
        employeeId: currentUserId,
        leaveType: newRequest.leaveType,
        startDate: toISODate(newRequest.startDate) || "",
        endDate: toISODate(newRequest.endDate) || "",
        totalDays: requestedDays,
        reason: newRequest.reason,
        startTime: newRequest.startTime || undefined,
        endTime: newRequest.endTime || undefined,
        notes: newRequest.notes,
      }

      const result = await leaveRequestService.createLeaveRequest(payload)

      if (result?.data) {
        toast({ title: 'Thành công', description: 'Đã tạo đơn nghỉ phép thành công' })
        await fetchLeaveRequests()
        // Refresh balance
        const balanceRes = await leaveBalanceService.getCurrentEmployeeLeaveBalance()
        if (balanceRes?.data) setCurrentUserBalance(balanceRes.data)

        setIsCreateModalOpen(false)
        setNewRequest({
          leaveType: "",
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          reason: "",
          notes: "",
        })
      } else {
        toast({ title: 'Lỗi', description: result?.error || 'Không thể tạo đơn nghỉ phép', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Đã có lỗi xảy ra', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    if (approvingRequestId === requestId) return
    try {
      setApprovingRequestId(requestId)
      const result = await leaveRequestService.approveLeaveRequest(requestId)
      if (result?.data) {
        toast({ title: 'Thành công', description: 'Đã duyệt đơn nghỉ phép' })
        fetchLeaveRequests()
      } else {
        toast({ title: 'Lỗi', description: result?.error || 'Không thể duyệt đơn', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Đã có lỗi xảy ra', variant: 'destructive' })
    } finally {
      setApprovingRequestId("")
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    if (rejectingRequestIdForLoading === requestId) return
    try {
      setRejectingRequestIdForLoading(requestId)
      const result = await leaveRequestService.rejectLeaveRequest(requestId, reason)
      if (result?.data) {
        toast({ title: 'Thành công', description: 'Đã từ chối đơn nghỉ phép' })
        fetchLeaveRequests()
        setIsRejectModalOpen(false)
        setRejectionReason("")
        setRejectingRequestId("")
      } else {
        toast({ title: 'Lỗi', description: result?.error || 'Không thể từ chối đơn', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Đã có lỗi xảy ra', variant: 'destructive' })
    } finally {
      setRejectingRequestIdForLoading("")
    }
  }

  const openRejectDialog = (requestId: string) => {
    setRejectingRequestId(requestId)
    setIsRejectModalOpen(true)
  }

  const viewRequestDetail = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setIsDetailModalOpen(true)
  }

  const filteredRequests = getFilteredRequests()

  const pendingCount = filteredRequests.filter((r) => r.status === "pending").length
  const approvedCount = filteredRequests.filter((r) => r.status === "approved").length
  const rejectedCount = filteredRequests.filter((r) => r.status === "rejected").length

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isPersonalView || effectiveRole === "Employee" ? "Đơn nghỉ phép của tôi" : "Quản lý nghỉ phép"}
          </h1>
          <p className="text-muted-foreground">
            {isPersonalView || effectiveRole === "Employee" 
              ? "Tạo đơn xin nghỉ phép và theo dõi trạng thái phê duyệt" 
              : "Quản lý tất cả đơn nghỉ phép trong công ty"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo đơn nghỉ phép
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Tạo đơn xin nghỉ phép</DialogTitle>
                <DialogDescription>Điền thông tin chi tiết về đơn xin nghỉ phép của bạn</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Loại nghỉ phép *</Label>
                    <Select value={newRequest.leaveType} onValueChange={(value) => setNewRequest({ ...newRequest, leaveType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại nghỉ phép" />
                      </SelectTrigger>
                      <SelectContent>
                        {allLeaveTypeCodes.map(code => (
                          <SelectItem key={code} value={code}>{getTypeBalanceLabel(code, currentUserBalance)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Removed "Số ngày nghỉ" per new requirements */}
                </div>
                {/* Cut leave type long description to reduce modal height */}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Từ ngày *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newRequest.startDate}
                      onChange={(e) => {
                        const v = e.target.value
                        setNewRequest({ ...newRequest, startDate: v, endDate: (newRequest.leaveType === "half_day" ? v : newRequest.endDate) })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Đến ngày *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      disabled={newRequest.leaveType === "half_day"}
                      value={newRequest.leaveType === "half_day" ? newRequest.startDate : newRequest.endDate}
                      onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {(newRequest.leaveType === "half_day" || newRequest.leaveType === "other") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Giờ bắt đầu</Label>
                      <Input id="startTime" type="time" value={newRequest.startTime} onChange={(e) => setNewRequest({ ...newRequest, startTime: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Giờ kết thúc</Label>
                      <Input id="endTime" type="time" value={newRequest.endTime} onChange={(e) => setNewRequest({ ...newRequest, endTime: e.target.value })} />
                    </div>
                  </div>
                )}

                
                <div className="space-y-2">
                  <Label htmlFor="reason">Lý do nghỉ phép *</Label>
                  <Textarea id="reason" placeholder="Nhập lý do nghỉ phép..." value={newRequest.reason} onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi chú thêm</Label>
                  <Textarea id="notes" placeholder="Ghi chú thêm (nếu có)..." value={newRequest.notes} onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })} />
                </div>

                {/* Removed urgent flag per new requirements */}

                {userRole === "Employee" && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-blue-700">Thông tin nghỉ phép của bạn</div>
                      {balanceLoading ? (
                        <div className="text-xs text-gray-500">Đang tải...</div>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsLeaveInfoSheetOpen(true)}
                          className="h-7 px-3 text-xs"
                        >
                          Chi tiết nghỉ phép
                        </Button>
                      )}
                    </div>

                    {currentUserBalance ? (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                          <div className="text-xs text-green-600 mb-1">Đã tích lũy</div>
                          <div className="text-lg font-bold text-green-700">{currentUserBalance.total_earned_days}</div>
                          <div className="text-xs text-green-600">ngày</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-center">
                          <div className="text-xs text-orange-600 mb-1">Đã sử dụng</div>
                          <div className="text-lg font-bold text-orange-700">{currentUserBalance.total_used_days}</div>
                          <div className="text-xs text-orange-600">ngày</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                          <div className="text-xs text-blue-600 mb-1">Còn lại</div>
                          <div className="text-lg font-bold text-blue-700">{currentUserBalance.remaining_days}</div>
                          <div className="text-xs text-blue-600">ngày</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">{!balanceLoading && "Không thể tải thông tin nghỉ phép"}</div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
                  Hủy
                </Button>
                <Button onClick={handleCreateRequest} disabled={!newRequest.leaveType || !newRequest.startDate || !newRequest.endDate || !newRequest.reason || isSubmitting}>
                  {isSubmitting ? "Đang gửi..." : "Gửi đơn"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Đơn đang chờ xử lý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Đơn đã được phê duyệt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Đơn bị từ chối</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredRequests.length}</div>
            <p className="text-xs text-muted-foreground">Tất cả đơn nghỉ phép</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balance Card (for Employee role and all users in personal view) */}
      {(effectiveRole === "Employee" || isPersonalView) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Số ngày phép còn lại năm {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <div>Đang tải số ngày phép...</div>
            ) : currentUserBalance ? (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{currentUserBalance.remaining_days ?? 0}</div>
                  <div className="text-sm text-green-700">Phép năm</div>
                  <div className="text-xs text-muted-foreground">Đã dùng: {currentUserBalance.total_used_days ?? 0}/{currentUserBalance.total_earned_days ?? 0}</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentUserBalance?.sick_leave?.remaining ?? 0}</div>
                  <div className="text-sm text-blue-700">Phép ốm</div>
                  <div className="text-xs text-muted-foreground">Đã dùng: {currentUserBalance?.sick_leave?.used ?? 0}/{currentUserBalance?.sick_leave?.total ?? 0}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{currentUserBalance?.personal_leave?.remaining ?? 0}</div>
                  <div className="text-sm text-purple-700">Việc riêng</div>
                  <div className="text-xs text-muted-foreground">Đã dùng: {currentUserBalance?.personal_leave?.used ?? 0}/{currentUserBalance?.personal_leave?.total ?? 0}</div>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">{currentUserBalance?.maternity_leave?.remaining ?? 0}</div>
                  <div className="text-sm text-pink-700">Thai sản</div>
                  <div className="text-xs text-muted-foreground">Đã dùng: {currentUserBalance?.maternity_leave?.used ?? 0}/{currentUserBalance?.maternity_leave?.total ?? 0}</div>
                </div>
              </div>
            ) : (
              <div>Không có dữ liệu phép.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn nghỉ phép</CardTitle>
          <CardDescription>
            {effectiveRole === "Employee" && "Các đơn nghỉ phép của bạn"}
            {effectiveRole === "Accountant" && "Các đơn nghỉ phép của bạn"}
            {effectiveRole === "HR" && "Tất cả đơn nghỉ phép trong công ty"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm theo tên, mã NV, lý do..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>

            {/* Status filter: dùng code values */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>

            {/* Type filter: dùng code values */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Loại nghỉ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="annual_leave">Phép năm</SelectItem>
                <SelectItem value="sick_leave">Nghỉ ốm</SelectItem>
                <SelectItem value="personal_leave">Việc riêng</SelectItem>
                <SelectItem value="maternity_leave">Thai sản</SelectItem>
                <SelectItem value="unpaid_leave">Không lương</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="mr-2 h-4 w-4" /> Cột
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {effectiveRole === "HR" && (
                  <DropdownMenuCheckboxItem checked={!!visibleColumns.employee} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, employee: !!v })}>Nhân viên</DropdownMenuCheckboxItem>
                )}
                <DropdownMenuCheckboxItem checked={!!visibleColumns.leaveType} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, leaveType: !!v })}>Loại nghỉ</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.timeRange} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, timeRange: !!v })}>Thời gian</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.days} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, days: !!v })}>Số ngày</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.reason} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, reason: !!v })}>Lý do</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.status} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, status: !!v })}>Trạng thái</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.approver} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, approver: !!v })}>Người duyệt</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.actions} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, actions: !!v })}>Thao tác</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {effectiveRole === "HR" && visibleColumns.employee && <TableHead>Nhân viên</TableHead>}
                  {visibleColumns.leaveType && <TableHead>Loại nghỉ</TableHead>}
                  {visibleColumns.timeRange && <TableHead>Thời gian</TableHead>}
                  {visibleColumns.days && <TableHead>Số ngày</TableHead>}
                  {visibleColumns.reason && <TableHead>Lý do</TableHead>}
                  {visibleColumns.status && <TableHead>Trạng thái</TableHead>}
                  {visibleColumns.approver && <TableHead>Người duyệt</TableHead>}
                  {visibleColumns.actions && <TableHead className="text-center">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    {effectiveRole === "HR" && visibleColumns.employee && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.employee?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.employee?.employee_code} • {request.employee?.department?.name}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.leaveType && (
                      <TableCell>
                        <Badge variant="outline">{leaveTypeLabel[request.leave_type] ?? request.leave_type}</Badge>
                      </TableCell>
                    )}
                    {visibleColumns.timeRange && (
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(request.start_date).toLocaleDateString("vi-VN")}</div>
                          <div className="text-muted-foreground">đến {new Date(request.end_date).toLocaleDateString("vi-VN")}</div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.days && (
                      <TableCell>
                        <Badge variant="secondary">{request.total_days} ngày</Badge>
                      </TableCell>
                    )}
                    {visibleColumns.reason && (
                      <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "approved" ? "default" : request.status === "pending" ? "secondary" : "destructive"
                          }
                        >
                          {statusLabel[request.status] ?? request.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.approver && (
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">Manager</div>
                          {request.approved_by_employee && (
                            <div className="text-muted-foreground">{request.approved_by_employee.name}</div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="text-center">
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
                            {request.status === "pending" && effectiveRole === "HR" && (
                              <DropdownMenuItem onClick={() => { setApprovingIdForDialog(request.id); setIsApprovalDialogOpen(true); setOpenDropdownId(null); }}>
                                <CheckCircle className="h-4 w-4" /> Duyệt
                              </DropdownMenuItem>
                            )}
                            {request.status === "pending" && effectiveRole === "HR" && (
                              <DropdownMenuItem onClick={() => { openRejectDialog(request.id); setOpenDropdownId(null); }}>
                                <XCircle className="h-4 w-4" /> Từ chối
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { viewRequestDetail(request); setOpenDropdownId(null); }}>
                              <Eye className="h-4 w-4" /> Xem
                            </DropdownMenuItem>
                            {request.status === 'pending' && request.employee_id === currentUserId && (
                              <DropdownMenuItem onClick={() => {
                                setEditingRequest(request)
                                setEditDraft({
                                  leaveType: request.leave_type,
                                  startDate: request.start_date,
                                  endDate: request.end_date,
                                  startTime: '',
                                  endTime: '',
                                  reason: request.reason || '',
                                  notes: request.notes || '',
                                })
                                setIsEditDialogOpen(true)
                                setOpenDropdownId(null)
                              }}>
                                <FileText className="h-4 w-4" /> Sửa
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - Personal manager */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa đơn nghỉ phép</DialogTitle>
            <DialogDescription>Cập nhật thông tin đơn nghỉ phép của bạn</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại nghỉ phép</Label>
                <Select value={editDraft.leaveType} onValueChange={(v) => setEditDraft({ ...editDraft, leaveType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allLeaveTypeCodes.map(code => (
                      <SelectItem key={code} value={code}>{leaveTypeLabel[code]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input type="date" value={editDraft.startDate} onChange={(e) => setEditDraft({ ...editDraft, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input type="date" value={editDraft.endDate} onChange={(e) => setEditDraft({ ...editDraft, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lý do</Label>
              <Textarea value={editDraft.reason} onChange={(e) => setEditDraft({ ...editDraft, reason: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
            <Button onClick={async () => {
              if (!editingRequest) return
              try {
                const result = await leaveRequestService.updateLeaveRequest(editingRequest.id, {
                  leaveType: editDraft.leaveType,
                  startDate: editDraft.startDate,
                  endDate: editDraft.endDate,
                  reason: editDraft.reason,
                  notes: editDraft.notes,
                } as any)
                if (result?.data) {
                  toast({ title: 'Thành công', description: 'Đã cập nhật đơn nghỉ phép' })
                  setIsEditDialogOpen(false)
                  setEditingRequest(null)
                  await fetchLeaveRequests()
                } else {
                  toast({ title: 'Lỗi', description: result?.error || 'Không thể cập nhật đơn', variant: 'destructive' })
                }
              } catch (err) {
                toast({ title: 'Lỗi', description: 'Đã có lỗi xảy ra', variant: 'destructive' })
              }
            }}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                    {selectedRequest.employee?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "NV"}
                  </div>
                  <div>
                    <div className="text-xl">Đơn nghỉ phép #{selectedRequest.id}</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      {selectedRequest.employee?.name} • {selectedRequest.employee?.employee_code}
                    </div>
                  </div>
                  {/* urgent badge removed */}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Request Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Thông tin nghỉ phép</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Loại nghỉ:</span>
                        <Badge variant="outline">{leaveTypeLabel[selectedRequest.leave_type] ?? selectedRequest.leave_type}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Từ ngày:</span>
                        <span className="font-medium">{new Date(selectedRequest.start_date).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Đến ngày:</span>
                        <span className="font-medium">{new Date(selectedRequest.end_date).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tổng số ngày:</span>
                        <Badge variant="secondary">{selectedRequest.total_days} ngày</Badge>
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
                        <Badge variant={selectedRequest.status === "approved" ? "default" : selectedRequest.status === "pending" ? "secondary" : "destructive"}>
                          {statusLabel[selectedRequest.status] ?? selectedRequest.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Người duyệt:</span>
                        <span className="font-medium">Manager</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ngày gửi:</span>
                        <span className="font-medium">{new Date(selectedRequest.submitted_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                      {selectedRequest.approved_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Ngày duyệt:</span>
                          <span className="font-medium">{new Date(selectedRequest.approved_at).toLocaleDateString("vi-VN")}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Reason and Notes */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Lý do nghỉ phép:</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">{selectedRequest.reason}</div>
                  </div>

                  {selectedRequest.notes && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Ghi chú thêm:</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">{selectedRequest.notes}</div>
                    </div>
                  )}

                  {selectedRequest.rejection_reason && (
                    <div>
                      <Label className="text-sm font-medium text-red-700">Lý do từ chối:</Label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{selectedRequest.rejection_reason}</div>
                    </div>
                  )}
                </div>

                {effectiveRole === "HR" && selectedRequest.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleApproveRequest(selectedRequest.id)
                        setIsDetailModalOpen(false)
                      }}
                      className="flex-1"
                      disabled={approvingRequestId === selectedRequest.id}
                    >
                      {approvingRequestId === selectedRequest.id ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {approvingRequestId === selectedRequest.id ? "Đang duyệt..." : "Phê duyệt"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        openRejectDialog(selectedRequest.id)
                        setIsDetailModalOpen(false)
                      }}
                      className="flex-1"
                      disabled={rejectingRequestIdForLoading === selectedRequest.id}
                    >
                      {rejectingRequestIdForLoading === selectedRequest.id ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      {rejectingRequestIdForLoading === selectedRequest.id ? "Đang từ chối..." : "Từ chối"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nhập lý do từ chối</DialogTitle>
            <DialogDescription>Vui lòng nhập lý do từ chối đơn nghỉ phép</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea id="rejectionReason" placeholder="Nhập lý do từ chối..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)} disabled={rejectingRequestIdForLoading === rejectingRequestId}>
              Hủy
            </Button>
            <Button onClick={() => handleRejectRequest(rejectingRequestId, rejectionReason)} disabled={rejectingRequestIdForLoading === rejectingRequestId || !rejectionReason.trim()}>
              {rejectingRequestIdForLoading === rejectingRequestId ? "Đang từ chối..." : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Approve Confirmation Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Bạn có chắc chắn muốn duyệt đơn nghỉ phép?</DialogTitle>
            <DialogDescription>Hành động này sẽ chuyển trạng thái đơn sang "Đã duyệt".</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsApprovalDialogOpen(false); setApprovingIdForDialog("") }}>Hủy</Button>
            <Button onClick={() => { if (approvingIdForDialog) handleApproveRequest(approvingIdForDialog); setIsApprovalDialogOpen(false); setApprovingIdForDialog("") }}>
              Duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Info Sheet - responsive (right on desktop, full-screen bottom on mobile) */}
      <Sheet open={isLeaveInfoSheetOpen} onOpenChange={setIsLeaveInfoSheetOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[100dvh] w-full p-4" : "w-[460px] p-4"}>
          <SheetHeader>
            <SheetTitle>Thông tin nghỉ phép</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-y-auto pr-1 mt-4 space-y-4">
            {balanceLoading ? (
              <div className="text-sm text-muted-foreground">Đang tải số liệu...</div>
            ) : currentUserBalance ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                    <div className="text-xs text-green-600 mb-1">Đã tích lũy</div>
                    <div className="text-lg font-bold text-green-700">{currentUserBalance.total_earned_days}</div>
                    <div className="text-xs text-green-600">ngày</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-center">
                    <div className="text-xs text-orange-600 mb-1">Đã sử dụng</div>
                    <div className="text-lg font-bold text-orange-700">{currentUserBalance.total_used_days}</div>
                    <div className="text-xs text-orange-600">ngày</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                    <div className="text-xs text-blue-600 mb-1">Còn lại</div>
                    <div className="text-lg font-bold text-blue-700">{currentUserBalance.remaining_days}</div>
                    <div className="text-xs text-blue-600">ngày</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-600 mb-1">Ngày bắt đầu chính thức</div>
                    <div className="font-semibold text-gray-800">
                      {currentUserBalance.official_start_date ? new Date(currentUserBalance.official_start_date).toLocaleDateString("vi-VN") : "Chưa có"}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-600 mb-1">Tháng làm việc chính thức</div>
                    <div className="font-semibold text-gray-800">{currentUserBalance.months_worked} tháng</div>
                  </div>
                </div>

                {currentUserBalance.next_earning_date && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                    <div className="text-xs text-purple-600 mb-1">Ngày tích lũy tiếp theo</div>
                    <div className="font-semibold text-purple-700">{new Date(currentUserBalance.next_earning_date).toLocaleDateString("vi-VN")}</div>
                  </div>
                )}

                {newRequest.leaveType && (
                  <div className="rounded-md border p-3 bg-muted/30">
                    <div className="font-medium mb-2 text-sm">
                      Quy định cho: {leaveTypeDescriptions[newRequest.leaveType as LeaveTypeCode]?.title}
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                      {leaveTypeDescriptions[newRequest.leaveType as LeaveTypeCode]?.bullets.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Không thể tải thông tin nghỉ phép</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
