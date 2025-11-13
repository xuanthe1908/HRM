"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Loader2, Upload, User, FileText, Banknote, Building, Calendar } from "lucide-react"
import { DocumentUpload } from '@/components/document-upload'
import { employeeService } from "@/lib/services"
import { toast } from "@/hooks/use-toast"
import type { Employee, Department, Position } from "@/lib/services"

// Schema validation cho form nhân viên
const employeeFormSchema = z.object({
  // Thông tin cơ bản
  employee_code: z.string().min(1, "Mã nhân viên là bắt buộc"),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),

  // Thông tin cá nhân
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  marital_status: z.string().optional(),
  children_count: z.coerce.number().min(0).optional(),
  ethnicity: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  education_level: z.string().optional(),

  // Thông tin định danh
  id_number: z.string().optional(),
  social_insurance_number: z.string().optional(),
  tax_code: z.string().optional(),
  id_card_issue_date: z.string().optional(),
  id_card_issue_place: z.string().optional(),

  // Địa chỉ
  permanent_address: z.string().optional(),
  current_address: z.string().optional(),

  // Thông tin ngân hàng
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),

  // Thông tin công việc (dropdowns bắt buộc)
  department_id: z.string().min(1, "Phòng ban là bắt buộc"),
  position_id: z.string().min(1, "Chức vụ là bắt buộc"),
  lead_id: z.string().optional(),
  manager_id: z.string().min(1, "Quản lý trực tiếp là bắt buộc"),
  job_level: z.string().optional(),
  job_position: z.string().optional(),

  // Thông tin hợp đồng
  start_date: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  probation_start_date: z.string().optional(),
  probation_end_date: z.string().optional(),
  probation_result: z.string().optional(),
  official_start_date: z.string().min(1, "Ngày chính thức là bắt buộc"),
  contract_type: z.string().min(1, "Loại hợp đồng là bắt buộc"),
  contract_end_date: z.string().min(1, "Ngày hết hạn hợp đồng là bắt buộc"),

  // Thông tin lương
  base_salary: z.coerce.number().min(0, "Lương phải là số dương"),
  meal_allowance: z.coerce.number().min(0).optional(),
  transport_allowance: z.coerce.number().min(0).optional(),
  phone_allowance: z.coerce.number().min(0).optional(),
  attendance_allowance: z.coerce.number().min(0).optional(),

  // Thông tin khác
  health_insurance_place: z.string().optional(),
  preferences: z.string().optional(),
  status: z.enum(['active', 'inactive', 'terminated', 'probation']),
  role: z.enum(['admin', 'hr', 'lead', 'accountant', 'employee']),
})

export type EmployeeFormData = z.infer<typeof employeeFormSchema>

interface EmployeeFormProps {
  departments: Department[]
  positions: Position[]
  employees: Employee[]
  onSubmit: (data: EmployeeFormData) => Promise<void | { id: string }>
  onCancel: () => void
  initialData?: Employee
  isSubmitting?: boolean
  error?: string
}

export function EmployeeForm({ 
  departments, 
  positions, 
  employees, 
  onSubmit, 
  onCancel, 
  initialData, 
  isSubmitting = false,
  error
}: EmployeeFormProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  // Pre-upload queue for new employees (no id yet)
  const [queuedDocs, setQueuedDocs] = useState<{
    id_card_front?: File | null;
    id_card_back?: File | null;
    contract?: File | null;
    work_permit?: File | null;
    others?: File[];
  }>({ others: [] });
  const idFrontRef = useRef<HTMLInputElement>(null)
  const idBackRef = useRef<HTMLInputElement>(null)
  const contractRef = useRef<HTMLInputElement>(null)
  const workPermitRef = useRef<HTMLInputElement>(null)
  const othersRef = useRef<HTMLInputElement>(null)

  // Load documents for existing employee
  const loadDocuments = async () => {
    if (!initialData?.id) return;
    
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/api/employees/${initialData.id}/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [initialData?.id]);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    mode: 'onChange',
    defaultValues: {
      employee_code: initialData?.employee_code || "",
      name: initialData?.name || "",
      email: initialData?.email || "",
      gender: initialData?.gender || "",
      birth_date: initialData?.birth_date || "",
      marital_status: initialData?.marital_status || "",
      children_count: initialData?.children_count || 0,
      ethnicity: initialData?.ethnicity || "",
      religion: initialData?.religion || "",
      nationality: initialData?.nationality || "Việt Nam",
      education_level: initialData?.education_level || "",
      id_number: initialData?.id_number || "",
      social_insurance_number: initialData?.social_insurance_number || "",
      tax_code: initialData?.tax_code || "",
      id_card_issue_date: initialData?.id_card_issue_date || "",
      id_card_issue_place: initialData?.id_card_issue_place || "",
      permanent_address: initialData?.permanent_address || "",
      current_address: initialData?.current_address || "",
      bank_account: initialData?.bank_account || "",
      bank_name: initialData?.bank_name || "",
      department_id: initialData?.department_id || "",
      position_id: initialData?.position_id || "",
      lead_id: initialData?.lead_id || "",
      manager_id: initialData?.manager_id || "",
      job_level: initialData?.job_level || "",
      job_position: initialData?.job_position || "",
      start_date: initialData ? (initialData.start_date || "") : new Date().toISOString().split('T')[0],
      probation_start_date: initialData?.probation_start_date || "",
      probation_end_date: initialData?.probation_end_date || "",
      probation_result: initialData?.probation_result || "",
      official_start_date: initialData?.official_start_date || (() => {
        const base = initialData?.start_date ? new Date(initialData.start_date) : new Date()
        const plus3 = new Date(base)
        plus3.setMonth(plus3.getMonth() + 3)
        const pad = (n: number) => n.toString().padStart(2, '0')
        return `${plus3.getFullYear()}-${pad(plus3.getMonth() + 1)}-${pad(plus3.getDate())}`
      })(),
      contract_type: initialData?.contract_type || "",
      contract_end_date: initialData ? (initialData.contract_end_date || "") : (() => {
        const today = new Date();
        const end = new Date(today);
        end.setMonth(end.getMonth() + 3);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      })(),
      base_salary: initialData?.base_salary || 0,
      meal_allowance: initialData?.meal_allowance || 0,
      transport_allowance: initialData?.transport_allowance || 0,
      phone_allowance: initialData?.phone_allowance || 0,
      attendance_allowance: initialData?.attendance_allowance || 0,
      health_insurance_place: initialData?.health_insurance_place || "",
      preferences: initialData?.preferences || "",
      status: ((['active','inactive','terminated','probation'] as const) as readonly string[]).includes((initialData?.status as any) || '')
        ? (initialData?.status as any)
        : "probation",
      role: initialData?.role || "employee",
    },
  })

  // Auto-generate employee_code on create: NV + 5 digits, increment from latest
  useEffect(() => {
    if (initialData) return
    const current = form.getValues("employee_code")
    if (current && current.trim() !== "") return

    const maxSeq = employees.reduce((max, emp) => {
      const match = /^NV(\d+)$/.exec(emp.employee_code || "")
      if (!match) return max
      const num = parseInt(match[1], 10)
      return Number.isFinite(num) && num > max ? num : max
    }, 0)
    const next = maxSeq + 1
    const code = `NV${String(next).padStart(5, '0')}`
    form.setValue("employee_code", code, { shouldValidate: true })
  }, [initialData, form, employees])

  // Logic tự động cho thử việc
  const selectedPositionId = form.watch("position_id")
  const selectedDepartmentId = form.watch("department_id")
  const isProbationPosition = positions.find(p => p.id === selectedPositionId)?.name === "Thử việc"

  // Filter positions by selected department (if any)
  const filteredPositions = selectedDepartmentId
    ? positions.filter(p => p.department_id === selectedDepartmentId)
    : positions

  // Clear position if it no longer matches selected department
  useEffect(() => {
    if (!selectedDepartmentId) return;
    const currentPos = positions.find(p => p.id === form.getValues("position_id"));
    if (currentPos && currentPos.department_id !== selectedDepartmentId) {
      form.setValue("position_id", "");
    }
  }, [selectedDepartmentId, positions, form])

  useEffect(() => {
    if (selectedPositionId) {
      const selectedPosition = positions.find(p => p.id === selectedPositionId)
      
      if (selectedPosition?.name === "Thử việc") {
        // Khi chọn chức vụ "Thử việc"
        const today = new Date().toISOString().split('T')[0]
        
        // Auto fill probation_start_date nếu chưa có (khi tạo mới)
        if (!initialData && !form.getValues("probation_start_date")) {
          form.setValue("probation_start_date", today)
        }
        
        // Auto set probation_result = "Đang thử việc"
        if (!form.getValues("probation_result") || form.getValues("probation_result") === "") {
          form.setValue("probation_result", "Đang thử việc")
        }
        
        // Clear official_start_date (vì đang thử việc)
        form.setValue("official_start_date", "")
        
      } else if (initialData?.position?.name === "Thử việc") {
        // Khi chuyển TỪ "Thử việc" SANG chức vụ khác
        const today = new Date().toISOString().split('T')[0]
        
        // Auto fill probation_end_date nếu chưa có
        if (!form.getValues("probation_end_date")) {
          form.setValue("probation_end_date", today)
        }
        
        // Auto fill official_start_date nếu chưa có
        if (!form.getValues("official_start_date")) {
          form.setValue("official_start_date", today)
        }
        
        // Auto set probation_result = "Đạt" nếu đang là "Đang thử việc"
        if (form.getValues("probation_result") === "Đang thử việc" || !form.getValues("probation_result")) {
          form.setValue("probation_result", "Đạt")
        }
      }
    }
  }, [selectedPositionId, positions, form, initialData])

  const handleSubmit = async (data: EmployeeFormData) => {
    const result = await onSubmit(data)
    // After create, if we have queued documents, upload them
    if (!initialData && result && (queuedDocs.id_card_front || queuedDocs.id_card_back || queuedDocs.contract || queuedDocs.work_permit || (queuedDocs.others && queuedDocs.others.length))) {
      const employeeId = result.id
      const uploadOne = async (file: File, type: string) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', type)
        await fetch(`/api/employees/${employeeId}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
          body: formData,
        })
      }
      try {
        if (queuedDocs.id_card_front) await uploadOne(queuedDocs.id_card_front, 'id_card_front')
        if (queuedDocs.id_card_back) await uploadOne(queuedDocs.id_card_back, 'id_card_back')
        if (queuedDocs.contract) await uploadOne(queuedDocs.contract, 'contract')
        if (queuedDocs.work_permit) await uploadOne(queuedDocs.work_permit, 'work_permit')
        if (queuedDocs.others && queuedDocs.others.length) {
          for (const f of queuedDocs.others) {
            await uploadOne(f, 'other')
          }
        }
      } catch (e) {
        console.error('Queued upload failed', e)
      }
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Cơ bản
              </TabsTrigger>
              <TabsTrigger value="work" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Công việc
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Hợp đồng
              </TabsTrigger>
              <TabsTrigger value="salary" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Lương
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tài liệu
              </TabsTrigger>
            </TabsList>

            {/* Tab Thông tin cơ bản */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cơ bản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employee_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Mã nhân viên <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="VD: NV0001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Họ và tên <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Họ và tên đầy đủ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email công việc <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="email@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Cá nhân removed for Admin/HR add/update; now managed on employee profile page */}

            {/* Tab Thông tin công việc */}
            <TabsContent value="work" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin công việc</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Phòng ban <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn phòng ban" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="position_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Chức vụ <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn chức vụ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredPositions.map((pos) => (
                                <SelectItem key={pos.id} value={pos.id}>
                                  {pos.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manager_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Quản lý trực tiếp <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn quản lý" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Vai trò <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn vai trò" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="employee">Nhân viên</SelectItem>
                              {/* <SelectItem value="lead">Quản lý</SelectItem> */}
                              <SelectItem value="accountant">Kế toán</SelectItem>
                              <SelectItem value="hr">Nhân sự</SelectItem>
                              <SelectItem value="admin">Quản trị viên</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {initialData && !['invite_sent','pending'].includes((initialData.status as any)) && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trạng thái</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Đang làm việc</SelectItem>
                                <SelectItem value="inactive">Tạm nghỉ</SelectItem>
                                <SelectItem value="terminated">Đã nghỉ việc</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Thông tin hợp đồng */}
            <TabsContent value="contract" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin hợp đồng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Row 1: start_date | contract_type */}
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ngày vào làm <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contract_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Loại hợp đồng <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn loại hợp đồng" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Hợp đồng thử việc">Hợp đồng thử việc</SelectItem>
                              <SelectItem value="Hợp đồng xác định thời gian">Hợp đồng xác định thời gian</SelectItem>
                              <SelectItem value="Hợp đồng không xác định thời gian">Hợp đồng không xác định thời gian</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Row 2: official_start_date | contract_end_date */}
                    <FormField
                      control={form.control}
                      name="official_start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ngày chính thức <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contract_end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ngày hết hạn hợp đồng <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Thông tin lương */}
            <TabsContent value="salary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin lương và phúc lợi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="base_salary"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Lương cơ bản <span className="text-red-500">*</span>
                          </FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="meal_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phụ cấp ăn trưa</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transport_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phụ cấp đi lại</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phụ cấp điện thoại</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="attendance_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phụ cấp chuyên cần</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>


            </TabsContent>

            {/* Tab Tài liệu */}
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tài liệu và hồ sơ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!initialData?.id ? (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">CCCD mặt trước</span>
                            <span className="text-xs text-muted-foreground">
                              {queuedDocs.id_card_front ? `(Đã chọn ${queuedDocs.id_card_front.name})` : `(Chưa có tài liệu)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => idFrontRef.current?.click()}>
                              <Upload className="h-4 w-4 mr-2" /> Tải lên
                            </Button>
                            <input ref={idFrontRef} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setQueuedDocs(prev => ({ ...prev, id_card_front: e.target.files?.[0] || null }))} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">CCCD mặt sau</span>
                            <span className="text-xs text-muted-foreground">
                              {queuedDocs.id_card_back ? `(Đã chọn ${queuedDocs.id_card_back.name})` : `(Chưa có tài liệu)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => idBackRef.current?.click()}>
                              <Upload className="h-4 w-4 mr-2" /> Tải lên
                            </Button>
                            <input ref={idBackRef} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setQueuedDocs(prev => ({ ...prev, id_card_back: e.target.files?.[0] || null }))} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Hợp đồng lao động</span>
                            <span className="text-xs text-muted-foreground">
                              {queuedDocs.contract ? `(Đã chọn ${queuedDocs.contract.name})` : `(Chưa có tài liệu)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => contractRef.current?.click()}>
                              <Upload className="h-4 w-4 mr-2" /> Tải lên
                            </Button>
                            <input ref={contractRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setQueuedDocs(prev => ({ ...prev, contract: e.target.files?.[0] || null }))} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Giấy phép lao động</span>
                            <span className="text-xs text-muted-foreground">
                              {queuedDocs.work_permit ? `(Đã chọn ${queuedDocs.work_permit.name})` : `(Chưa có tài liệu)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => workPermitRef.current?.click()}>
                              <Upload className="h-4 w-4 mr-2" /> Tải lên
                            </Button>
                            <input ref={workPermitRef} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setQueuedDocs(prev => ({ ...prev, work_permit: e.target.files?.[0] || null }))} />
                          </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Tài liệu khác</span>
                            <span className="text-xs text-muted-foreground">
                              {queuedDocs.others && queuedDocs.others.length > 0 ? `(Đã chọn ${queuedDocs.others.length} file)` : `(Chưa có tài liệu)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => othersRef.current?.click()}>
                              <Upload className="h-4 w-4 mr-2" /> Tải lên
                            </Button>
                            <input ref={othersRef} multiple type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setQueuedDocs(prev => ({ ...prev, others: e.target.files ? Array.from(e.target.files) : [] }))} />
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">Hỗ trợ: JPG, PNG, PDF, DOC, DOCX (tối đa 10MB)</div>
                    </div>
                  ) : isLoadingDocuments ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Đang tải tài liệu...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* CCCD mặt trước */}
                      <DocumentUpload
                        employeeId={initialData.id}
                        documentType="id_card_front"
                        documentName="CCCD mặt trước"
                        existingDocument={documents.find(doc => doc.type === 'id_card_front')}
                        onUploadSuccess={loadDocuments}
                        disabled={isSubmitting}
                      />

                      {/* CCCD mặt sau */}
                      <DocumentUpload
                        employeeId={initialData.id}
                        documentType="id_card_back"
                        documentName="CCCD mặt sau"
                        existingDocument={documents.find(doc => doc.type === 'id_card_back')}
                        onUploadSuccess={loadDocuments}
                        disabled={isSubmitting}
                      />

                      {/* Hợp đồng lao động */}
                      <DocumentUpload
                        employeeId={initialData.id}
                        documentType="contract"
                        documentName="Hợp đồng lao động"
                        existingDocument={documents.find(doc => doc.type === 'contract')}
                        onUploadSuccess={loadDocuments}
                        disabled={isSubmitting}
                      />

                      {/* Giấy phép lao động */}
                      <DocumentUpload
                        employeeId={initialData.id}
                        documentType="work_permit"
                        documentName="Giấy phép lao động"
                        existingDocument={documents.find(doc => doc.type === 'work_permit')}
                        onUploadSuccess={loadDocuments}
                        disabled={isSubmitting}
                      />

                      {/* Tài liệu khác */}
                      {documents.filter(doc => doc.type === 'other').map((doc, index) => (
                        <DocumentUpload
                          key={`other-${index}`}
                          employeeId={initialData.id}
                          documentType="other"
                          documentName={doc.name}
                          existingDocument={doc}
                          onUploadSuccess={loadDocuments}
                          disabled={isSubmitting}
                        />
                      ))}

                      {/* Button thêm tài liệu khác */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <DocumentUpload
                          employeeId={initialData.id}
                          documentType="other"
                          documentName="Tài liệu khác"
                          onUploadSuccess={loadDocuments}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Error Message Display */}
          {/* {error && (
            <div className="rounded-md bg-destructive/15 p-4 border border-destructive/20">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">
                    Lỗi
                  </h3>
                  <div className="mt-2 text-sm text-destructive">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )} */}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Cập nhật' : 'Thêm nhân viên'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 