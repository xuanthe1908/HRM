"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, MapPin, Calendar, Building2, Edit, User, IdCard, CalendarDays, Loader2, X, Save, Eye } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { AvatarUpload } from "@/components/avatar-upload"
import { getAvatarUrl } from "@/lib/avatar-utils"
import { toast } from "@/hooks/use-toast"
import { employeeService } from "@/lib/services"
import { DocumentUpload } from "@/components/document-upload"
import { DependentPersonsRequestModal } from "@/components/dependent-persons-request-modal"
import { EmployeeRequestService } from "@/lib/employee-request-service"

// Import useLanguage hook
import { useLanguage } from "@/contexts/language-context"
import { isProfileComplete, getMissingFields } from "@/lib/profile-completion-check"
import { getCookie, setCookie, removeCookie } from "@/lib/cookie-utils"
import { VIETNAMESE_ETHNICITIES, VIETNAMESE_BANKS, COUNTRIES } from "@/data/vietnam"

// Schema validation for profile editing
const profileEditSchema = z.object({
  // Basic Information
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(10, "Số điện thoại phải có ít nhất 10 số"),
  personal_email: z.string().email("Email cá nhân không hợp lệ").optional().or(z.literal('')),
  
  // Personal Information
  gender: z.string().min(1, "Vui lòng chọn giới tính"),
  birth_date: z.string().min(1, "Ngày sinh là bắt buộc"),
  marital_status: z.string().min(1, "Tình trạng hôn nhân là bắt buộc"),
  children_count: z.coerce.number().min(0).optional(),
  ethnicity: z.string().min(1, "Dân tộc là bắt buộc"),
  religion: z.string().min(1, "Tôn giáo là bắt buộc"),
  nationality: z.string().min(1, "Quốc tịch là bắt buộc"),
  education_level: z.string().min(1, "Trình độ học vấn là bắt buộc"),
  
  // Identity Information
  id_number: z.string().min(9, "Số CCCD/CMND phải có ít nhất 9 số"),
  social_insurance_number: z.string().optional().or(z.literal('')),
  tax_code: z.string().optional().or(z.literal('')),
  id_card_issue_date: z.string().min(1, "Ngày cấp CCCD là bắt buộc"),
  id_card_issue_place: z.string().min(1, "Nơi cấp CCCD là bắt buộc"),
  id_card_front_url: z
    .string({ required_error: "Ảnh CCCD mặt trước là bắt buộc" })
    .min(1, "Ảnh CCCD mặt trước là bắt buộc"),
  id_card_back_url: z
    .string({ required_error: "Ảnh CCCD mặt sau là bắt buộc" })
    .min(1, "Ảnh CCCD mặt sau là bắt buộc"),
  
  // Address Information
  permanent_address: z.string().min(1, "Địa chỉ thường trú là bắt buộc"),
  current_address: z.string().min(1, "Địa chỉ tạm trú là bắt buộc"),
  
  // Bank Information
  bank_account: z.string().min(1, "Số tài khoản là bắt buộc"),
  bank_name: z.string().min(1, "Tên ngân hàng là bắt buộc"),
})

type ProfileFormData = z.infer<typeof profileEditSchema>

export default function EmployeeProfile() {
  const { user, loading, refreshUser } = useAuth()
  const { t, formatCurrency } = useLanguage()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentAvatarPath, setCurrentAvatarPath] = useState<string | null>(user?.avatar_url || null)
  const [pendingAvatarPath, setPendingAvatarPath] = useState<string | null>(null)
  const [avatarResetTick, setAvatarResetTick] = useState(0)
  const [autoEditChecked, setAutoEditChecked] = useState(false)
  const [documents, setDocuments] = useState<{ type: string; name: string; url?: string; path: string }[]>([])
  const [showDependentRequestModal, setShowDependentRequestModal] = useState(false)
  const [pendingChildrenCount, setPendingChildrenCount] = useState<number | null>(null)
  const DRAFT_KEY = user ? `profile_draft_${user.id}` : undefined

  // Form setup
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileEditSchema),
    mode: 'onChange',
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      personal_email: user?.personal_email || '',
      gender: user?.gender || '',
      birth_date: user?.birth_date || '',
      marital_status: user?.marital_status || '',
      children_count: user?.children_count || 0,
      ethnicity: user?.ethnicity || '',
      religion: user?.religion || '',
      nationality: user?.nationality || 'Việt Nam',
      education_level: user?.education_level || '',
      id_number: user?.id_number || '',
      social_insurance_number: user?.social_insurance_number || '',
      tax_code: user?.tax_code || '',
      id_card_issue_date: user?.id_card_issue_date || '',
      id_card_issue_place: user?.id_card_issue_place || '',
      id_card_front_url: user?.id_card_front_url || '',
      id_card_back_url: user?.id_card_back_url || '',
      permanent_address: user?.permanent_address || '',
      current_address: user?.current_address || '',
      bank_account: user?.bank_account || '',
      bank_name: user?.bank_name || '',
    },
  })

  // Restore draft when entering edit mode or on first render if available (cookie-based)
  useEffect(() => {
    if (!user || !DRAFT_KEY) return
    const raw = typeof document !== 'undefined' ? getCookie(DRAFT_KEY) : null
    if (raw) {
      try {
        const draft = JSON.parse(raw) as Partial<ProfileFormData>
        // Preload draft values but do not auto-enter edit mode
        form.reset({ ...form.getValues(), ...draft })
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAFT_KEY])

  // Autosave draft while editing (cookie-based)
  useEffect(() => {
    if (!DRAFT_KEY) return
    const subscription = form.watch((values) => {
      if (isEditMode) {
        try { setCookie(DRAFT_KEY, JSON.stringify(values), { expires: 7, path: '/' }) } catch {}
      }
    })
    return () => subscription.unsubscribe()
  }, [form, isEditMode, DRAFT_KEY])

  // Sync avatar path với user data
  useEffect(() => {
    if (user?.avatar_url !== undefined) {
      setCurrentAvatarPath(user.avatar_url)
    }
  }, [user?.avatar_url])

  // Sync form values with user data when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        phone: user.phone || '',
        personal_email: user.personal_email || '',
        gender: user.gender || '',
        birth_date: user.birth_date || '',
        marital_status: user.marital_status || '',
        children_count: user.children_count || 0,
        ethnicity: user.ethnicity || '',
        religion: user.religion || '',
        nationality: user.nationality || 'Việt Nam',
        education_level: user.education_level || '',
        id_number: user.id_number || '',
        social_insurance_number: user.social_insurance_number || '',
        tax_code: user.tax_code || '',
        id_card_issue_date: user.id_card_issue_date || '',
        id_card_issue_place: user.id_card_issue_place || '',
        id_card_front_url: user.id_card_front_url || '',
        id_card_back_url: user.id_card_back_url || '',
        permanent_address: user.permanent_address || '',
        current_address: user.current_address || '',
        bank_account: user.bank_account || '',
        bank_name: user.bank_name || '',
      })
    }
  }, [user, form])

  // Previously auto-entered edit mode for incomplete profiles.
  // Behavior changed: start in view mode by default; user can choose to edit or resume draft.
  useEffect(() => {
    if (!autoEditChecked) {
      setAutoEditChecked(true)
    }
  }, [autoEditChecked])

  // Load signed document URLs for view mode and to pass into upload components
  useEffect(() => {
    const loadDocuments = async () => {
      if (!user) return
      try {
        const res = await fetch(`/api/employees/${user.id}/documents`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        })
        if (res.ok) {
          const data = await res.json()
          setDocuments(data.documents || [])
        }
      } catch (e) {
        // ignore
      }
    }
    loadDocuments()
  }, [user])

  const getDocumentByType = (docType: string) => documents.find(d => d.type === docType)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthGuard>
        <div>Không tìm thấy thông tin nhân viên</div>
      </AuthGuard>
    )
  }

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa có thông tin'
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Status badge mapping
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'invite_sent': { label: 'Đã gửi lời mời', variant: 'secondary' as const },
      'pending': { label: 'Chờ hoàn thiện hồ sơ', variant: 'outline' as const },
      'active': { label: 'Đang làm việc', variant: 'default' as const },
      'inactive': { label: 'Tạm nghỉ', variant: 'secondary' as const },
      'terminated': { label: 'Đã nghỉ việc', variant: 'destructive' as const },
      'probation': { label: 'Đang thử việc', variant: 'outline' as const }
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const }
  }

  // Role mapping
  const getRoleLabel = (role: string) => {
    const roleMap = {
      'admin': 'Quản trị viên',
      'hr': 'Nhân sự',
      'lead': 'Trưởng nhóm',
      'accountant': 'Kế toán',
      'employee': 'Nhân viên'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const statusInfo = getStatusBadge(user.status)
  const profileComplete = isProfileComplete(user)
  const missingFields = getMissingFields(user)

  const handleEditSuccess = () => {
    // Refresh user data sau khi edit thành công
    refreshUser()
    setIsEditMode(false) // Exit edit mode
    if (DRAFT_KEY) {
      try { removeCookie(DRAFT_KEY, { path: '/' }) } catch {}
    }
  }

  const handleEditCancel = () => {
    setIsEditMode(false)
    if (DRAFT_KEY) {
      try { removeCookie(DRAFT_KEY, { path: '/' }) } catch {}
    }
    // Reset form to original values
    form.reset({
      name: user?.name || '',
      phone: user?.phone || '',
      personal_email: user?.personal_email || '',
      gender: user?.gender || '',
      birth_date: user?.birth_date || '',
      marital_status: user?.marital_status || '',
      children_count: user?.children_count || 0,
      ethnicity: user?.ethnicity || '',
      religion: user?.religion || '',
      nationality: user?.nationality || 'Việt Nam',
      education_level: user?.education_level || '',
      id_number: user?.id_number || '',
      social_insurance_number: user?.social_insurance_number || '',
      tax_code: user?.tax_code || '',
      id_card_issue_date: user?.id_card_issue_date || '',
      id_card_issue_place: user?.id_card_issue_place || '',
      permanent_address: user?.permanent_address || '',
      current_address: user?.current_address || '',
      bank_account: user?.bank_account || '',
      bank_name: user?.bank_name || '',
    })
    // Refresh user data and reset avatar preview (in case a deferred avatar was chosen)
    refreshUser()
    setPendingAvatarPath(null)
    setAvatarResetTick((v) => v + 1)
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return
    
    setIsSubmitting(true)
    try {
      // Use pending avatar path if selected during edit
      let newAvatarPath: string | null = pendingAvatarPath === '__REMOVE__' ? null : pendingAvatarPath

      // Validate: avatar is required like ID images
      if ((currentAvatarPath == null) && (newAvatarPath == null)) {
        toast({
          variant: 'destructive',
          title: 'Thiếu avatar',
          description: 'Vui lòng tải lên ảnh đại diện trước khi lưu.'
        })
        setIsSubmitting(false)
        return
      }

      const payload = { ...data } as any
      if (pendingAvatarPath !== null) {
        payload.avatar_url = newAvatarPath
      }

      const result = await employeeService.updateEmployee(user.id, payload)
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Cập nhật thất bại",
          description: `Không thể cập nhật hồ sơ. Lỗi: ${result.error}`,
        })
        // Keep user in edit mode and preserve draft
      } else {
        toast({
          title: "Cập nhật hồ sơ thành công",
          description: "Thông tin hồ sơ đã được cập nhật thành công.",
        })
        refreshUser()
        if (newAvatarPath !== null) setCurrentAvatarPath(newAvatarPath)
        setPendingAvatarPath(null)
        setAvatarResetTick((v) => v + 1)
        if (DRAFT_KEY) {
          try { removeCookie(DRAFT_KEY, { path: '/' }) } catch {}
        }
        setIsEditMode(false)
        if (DRAFT_KEY) {
          try { localStorage.removeItem(DRAFT_KEY) } catch {}
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
      })
      // Keep values; draft already saved
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAvatarChange = (newAvatarPath: string | null) => {
    // Update local state
    setCurrentAvatarPath(newAvatarPath)
    // Refresh user data để sync với database
    refreshUser()
  }

  // Handle children count change
  const handleChildrenCountChange = (newCount: number) => {
    const currentCount = user?.children_count || 0
    
    if (newCount === 0) {
      // If setting to 0, update directly without request
      form.setValue("children_count", newCount)
    } else if (newCount !== currentCount) {
      // If changing to a non-zero value, show request modal
      setPendingChildrenCount(newCount)
      setShowDependentRequestModal(true)
    }
  }

  // Handle dependent request success
  const handleDependentRequestSuccess = () => {
    if (pendingChildrenCount !== null) {
      form.setValue("children_count", pendingChildrenCount)
      setPendingChildrenCount(null)
    }
    setShowDependentRequestModal(false)
  }

  // Show toast when form validation fails
  const onInvalid = (errors: any) => {
    const firstError: any = Object.values(errors)[0]
    const message = firstError?.message || 'Vui lòng kiểm tra các trường bắt buộc và dữ liệu không hợp lệ.'
    toast({
      variant: 'destructive',
      title: 'Form không hợp lệ',
      description: message,
    })
  }

  return (
    <AuthGuard>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ của tôi'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Cập nhật thông tin cá nhân của bạn' : 'Xem và quản lý thông tin cá nhân của bạn'}
            </p>
            {!profileComplete && !isEditMode && (
              <div className="mt-2">
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Hồ sơ chưa hoàn thiện ({missingFields.length} thông tin còn thiếu)
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleEditCancel} disabled={isSubmitting}>
                  <X className="mr-2 h-4 w-4" />
                  Hủy
                </Button>
                <Button onClick={form.handleSubmit(onSubmit, onInvalid)} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditMode(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa hồ sơ
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Profile Card */}
              <Card className="md:col-span-1">
                <CardHeader className="text-center">
                  <AvatarUpload
                    currentAvatarPath={currentAvatarPath}
                    employeeId={user.id}
                    employeeName={user.name}
                    onAvatarChange={handleAvatarChange}
                    onFileSelected={(path) => setPendingAvatarPath(path)}
                    size="lg"
                    showLabel={false}
                    disabled={!isEditMode}
                    hideActions={!isEditMode}
                    deferredUpload
                  />
                  <CardTitle className="mt-4">{user.name}</CardTitle>
                  <CardDescription>{user.position?.name || 'Chưa có chức vụ'}</CardDescription>
                  <Badge variant={statusInfo.variant} className="w-fit mx-auto">
                    {statusInfo.label}
                  </Badge>
                </CardHeader>
              </Card>

              {/* Employment Details */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Chi tiết công việc</CardTitle>
                  <CardDescription>Thông tin về vị trí và vai trò công việc của bạn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mã nhân viên</label>
                    <p className="font-medium">{user.employee_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email công ty</label>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phòng ban</label>
                    <p className="font-medium">{user.department?.name || 'Chưa phân công'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Chức vụ</label>
                    <p className="font-medium">{user.position?.name || 'Chưa có'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Quản lý trực tiếp</label>
                    <p className="font-medium">{user.manager?.name || 'Chưa có'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personal Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>Thông tin chi tiết về cá nhân của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Personal Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-blue-600">Thông tin cơ bản</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Họ và tên</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("name")}
                              className="h-8 text-sm"
                              placeholder="Họ và tên"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.name || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Số điện thoại</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("phone")}
                              className="h-8 text-sm"
                              placeholder="Số điện thoại"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.phone || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ngày sinh</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("birth_date")}
                              type="date"
                              className="h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{formatDate(user.birth_date)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Giới tính</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Select value={form.watch("gender")} onValueChange={(value) => form.setValue("gender", value)}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Chọn giới tính" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Nam">Nam</SelectItem>
                                <SelectItem value="Nữ">Nữ</SelectItem>
                                {/* <SelectItem value="other">Khác</SelectItem> */}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="font-medium">{user.gender || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tình trạng hôn nhân</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Select value={form.watch("marital_status")} onValueChange={(value) => form.setValue("marital_status", value)}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Chọn tình trạng" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Độc thân">Độc thân</SelectItem>
                                <SelectItem value="Đã kết hôn">Đã kết hôn</SelectItem>
                                <SelectItem value="Ly hôn">Ly hôn</SelectItem>
                                <SelectItem value="Góa">Góa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="font-medium">{user.marital_status || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Người phụ thuộc</span>
                        <div className="flex items-center gap-3">
                          {((user.children_count || 0) > 0) ? (
                            <>
                              <span className="font-medium">{user.children_count}</span>
                              {isEditMode && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => {
                                    setPendingChildrenCount(null)
                                    setShowDependentRequestModal(true)
                                  }}
                                >
                                  Gửi yêu cầu thay đổi
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-muted-foreground">Chưa khai báo</span>
                              {isEditMode && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => {
                                    setPendingChildrenCount(null)
                                    setShowDependentRequestModal(true)
                                  }}
                                >
                                  Gửi yêu cầu khai báo
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Dân tộc</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Autocomplete
                              value={form.watch("ethnicity")}
                              onChange={(value) => form.setValue("ethnicity", value)}
                              placeholder="Chọn dân tộc"
                              options={VIETNAMESE_ETHNICITIES.map(e => ({ label: e, value: e }))}
                              className="h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.ethnicity || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tôn giáo</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("religion")}
                              className="h-8 text-sm"
                              placeholder="Tôn giáo"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.religion || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Quốc tịch</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Autocomplete
                              value={form.watch("nationality")}
                              onChange={(value) => form.setValue("nationality", value)}
                              placeholder="Chọn quốc tịch"
                              options={COUNTRIES.map(c => ({ label: c, value: c }))}
                              className="h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.nationality || 'Việt Nam'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Trình độ học vấn</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Select value={form.watch("education_level")} onValueChange={(value) => form.setValue("education_level", value)}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Chọn trình độ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Trung học phổ thông">Trung học phổ thông</SelectItem>
                                <SelectItem value="Cao đẳng">Cao đẳng</SelectItem>
                                <SelectItem value="Đại học">Đại học</SelectItem>
                                <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                                <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="font-medium">{user.education_level || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-green-600">Thông tin liên lạc</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Email cá nhân</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("personal_email")}
                              type="email"
                              className="h-8 text-sm"
                              placeholder="email@example.com"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.personal_email || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Địa chỉ thường trú</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Textarea
                              {...form.register("permanent_address")}
                              className="text-sm"
                              placeholder="Địa chỉ thường trú"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-right max-w-xs">{user.permanent_address || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Địa chỉ tạm trú</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Textarea
                              {...form.register("current_address")}
                              className="text-sm"
                              placeholder="Địa chỉ tạm trú"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-right max-w-xs">{user.current_address || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Số tài khoản</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("bank_account")}
                              className="h-8 text-sm"
                              placeholder="Số tài khoản"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.bank_account || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ngân hàng</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Autocomplete
                              value={form.watch("bank_name")}
                              onChange={(value) => form.setValue("bank_name", value)}
                              placeholder="Chọn ngân hàng"
                              options={VIETNAMESE_BANKS.map(b => ({ label: b, value: b }))}
                              className="h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.bank_name || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Thông tin định danh</CardTitle>
                <CardDescription>Thông tin giấy tờ tùy thân và bảo hiểm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Identity Documents */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-purple-600">Giấy tờ tùy thân</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Số CCCD/CMND</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("id_number")}
                              className="h-8 text-sm"
                              placeholder="Số CCCD/CMND"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.id_number || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ngày cấp CCCD</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("id_card_issue_date")}
                              type="date"
                              className="h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{formatDate(user.id_card_issue_date)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Nơi cấp CCCD</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("id_card_issue_place")}
                              className="h-8 text-sm"
                              placeholder="Nơi cấp CCCD"
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-right max-w-xs">{user.id_card_issue_place || 'Chưa có thông tin'}</span>
                        )}
                      </div>

                      {/* CCCD Front (vertical item) */}
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">CCCD - Mặt trước</span>
                        {isEditMode ? (
                          <div className="w-[420px] max-w-full">
                            <DocumentUpload
                              employeeId={user.id}
                              documentType="id_card_front"
                              documentName="Ảnh CCCD mặt trước"
                              existingDocument={getDocumentByType('id_card_front') as any}
                              onUploadSuccess={(path?: string | string[]) => {
                                const filePath = Array.isArray(path) ? path?.[0] : path
                                if (filePath) {
                                  form.setValue('id_card_front_url', filePath, { shouldValidate: true })
                                } else {
                                  form.setValue('id_card_front_url', '', { shouldValidate: true })
                                }
                                refreshUser()
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.id_card_front_url ? 'Đã tải lên' : 'Chưa có'}</span>
                            {user.id_card_front_url && getDocumentByType('id_card_front')?.url && (
                              <button
                                type="button"
                                className="p-1 hover:text-blue-600"
                                onClick={() => window.open(getDocumentByType('id_card_front')!.url, '_blank')}
                                title="Xem tài liệu"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CCCD Back (vertical item) */}
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">CCCD - Mặt sau</span>
                        {isEditMode ? (
                          <div className="w-[420px] max-w-full">
                            <DocumentUpload
                              employeeId={user.id}
                              documentType="id_card_back"
                              documentName="Ảnh CCCD mặt sau"
                              existingDocument={getDocumentByType('id_card_back') as any}
                              onUploadSuccess={(path?: string | string[]) => {
                                const filePath = Array.isArray(path) ? path?.[0] : path
                                if (filePath) {
                                  form.setValue('id_card_back_url', filePath, { shouldValidate: true })
                                } else {
                                  form.setValue('id_card_back_url', '', { shouldValidate: true })
                                }
                                refreshUser()
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.id_card_back_url ? 'Đã tải lên' : 'Chưa có'}</span>
                            {user.id_card_back_url && getDocumentByType('id_card_back')?.url && (
                              <button
                                type="button"
                                className="p-1 hover:text-blue-600"
                                onClick={() => window.open(getDocumentByType('id_card_back')!.url, '_blank')}
                                title="Xem tài liệu"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Insurance Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-orange-600">Bảo hiểm & Thuế</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Số BHXH</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("social_insurance_number")}
                              className="h-8 text-sm"
                              placeholder="Số bảo hiểm xã hội"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.social_insurance_number || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Mã số thuế</span>
                        {isEditMode ? (
                          <div className="w-48">
                            <Input
                              {...form.register("tax_code")}
                              className="h-8 text-sm"
                              placeholder="Mã số thuế"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">{user.tax_code || 'Chưa có thông tin'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Thông tin lương cơ bản</CardTitle>
                <CardDescription>Mức lương cơ bản hiện tại của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Basic Salary */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-green-600">Lương cơ bản</h3>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-center">
                        <p className="text-sm text-green-600 font-medium">Lương cơ bản hàng tháng</p>
                        <p className="text-3xl font-bold text-green-700">{formatCurrency(user.base_salary)}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>• Đây là mức lương cơ bản được ghi trong hợp đồng</p>
                      <p>• Lương thực nhận có thể khác do phụ cấp và khấu trừ</p>
                      <p>• Để xem chi tiết lương, vui lòng xem phần Lương của tôi</p>
                    </div>
                  </div>

                  {/* Allowance Summary replacing employment period */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-blue-600">Phụ cấp của tôi</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 border rounded bg-gray-50 flex justify-between">
                        <span className="text-sm text-muted-foreground">Phụ cấp ăn trưa</span>
                        <span className="font-medium">{formatCurrency(user.meal_allowance || 0)}</span>
                      </div>
                      <div className="p-3 border rounded bg-gray-50 flex justify-between">
                        <span className="text-sm text-muted-foreground">Phụ cấp đi lại</span>
                        <span className="font-medium">{formatCurrency(user.transport_allowance || 0)}</span>
                      </div>
                      <div className="p-3 border rounded bg-gray-50 flex justify-between">
                        <span className="text-sm text-muted-foreground">Phụ cấp điện thoại</span>
                        <span className="font-medium">{formatCurrency(user.phone_allowance || 0)}</span>
                      </div>
                      <div className="p-3 border rounded bg-gray-50 flex justify-between">
                        <span className="text-sm text-muted-foreground">Phụ cấp chuyên cần</span>
                        <span className="font-medium">{formatCurrency(user.attendance_allowance || 0)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">Các phụ cấp được áp dụng theo quy chế công ty.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        </form>

        {/* Dependent Persons Request Modal */}
        <DependentPersonsRequestModal
          isOpen={showDependentRequestModal}
          onClose={() => setShowDependentRequestModal(false)}
          currentCount={user?.children_count || 0}
          onSuccess={handleDependentRequestSuccess}
          employeeId={user.id}
        />
      </div>
    </AuthGuard>
  )
}
