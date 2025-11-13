"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose
} from "@/components/ui/sheet"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Eye, Edit, Trash2, Users, Loader2, X, Check, MoreVertical, Settings2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { employeeService, departmentService, positionService } from "@/lib/services"
import type { Employee, Department, Position } from "@/lib/services"
import { Skeleton } from "@/components/ui/skeleton"
import { EmployeeForm } from "@/components/employee-form"
import { AuthGuard } from "@/components/auth-guard"
import type { EmployeeFormData } from "@/components/employee-form"
import { toast } from "@/hooks/use-toast"
import { EmployeeViewSheet } from "@/components/employee-view-sheet"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { useCookies } from "@/hooks/use-cookies"

// Schema for form validation using Zod
const employeeSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional().or(z.literal('')),
  employee_code: z.string().min(1, "Mã nhân viên là bắt buộc"),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  start_date: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
  manager_id: z.string().optional(),
  base_salary: z.coerce.number().min(0, "Lương phải là số dương"),
  status: z.enum(['invite_sent', 'pending', 'active', 'inactive', 'terminated', 'probation']),
  role: z.enum(['admin', 'hr', 'accountant', 'employee']),
});

function EmployeesPageInner() {
  const { t, formatCurrency } = useLanguage()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  
  // States for dialogs/sheets
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null)
  const [isApprovalAlertOpen, setIsApprovalAlertOpen] = useState(false)
  const [approvingEmployeeId, setApprovingEmployeeId] = useState<string | null>(null)
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useCookies<Record<string, boolean>>("employees_table_columns", {
    name: true,
    code: true,
    department: true,
    position: true,
    baseSalary: true,
    status: true,
    actions: true,
  })
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)


  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      employee_code: "",
      phone: "",
      birth_date: "",
      start_date: new Date().toISOString().split('T')[0],
      department_id: undefined,
      position_id: undefined,
      manager_id: undefined,
      base_salary: 0,
      status: "probation",
      role: "employee",
    },
  })

  const fetchData = async () => {
    setLoading(true)
    const [empRes, deptRes, posRes] = await Promise.all([
      employeeService.getEmployees(),
      departmentService.getDepartments(),
      positionService.getPositions()
    ])
    if (empRes.data) setEmployees(empRes.data)
    if (deptRes.data) setDepartments(deptRes.data)
    if (posRes.data) setPositions(posRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddNew = () => {
    form.reset({
      name: "",
      email: "",
      password: "",
      employee_code: "",
      phone: "",
      birth_date: "",
      start_date: new Date().toISOString().split('T')[0],
      department_id: undefined,
      position_id: undefined,
              manager_id: undefined,
      base_salary: 0,
      status: "probation",
      role: "employee",
    })
    setEditingEmployee(null)
    setFormError(null)
    setIsSheetOpen(true)
  }



  const confirmDelete = async () => {
    if (!deletingEmployeeId) return;
    const result = await employeeService.deleteEmployee(deletingEmployeeId)
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Xóa nhân viên thất bại",
        description: `Không thể xóa nhân viên. Lỗi: ${result.error}`,
      })
    } else {
      toast({
        title: "Xóa nhân viên thành công",
        description: "Nhân viên đã được xóa khỏi hệ thống.",
      })
      fetchData() // Refresh data
    }
    setIsAlertOpen(false)
    setDeletingEmployeeId(null)
  }


  const confirmApprove = async () => {
    if (!approvingEmployeeId) return;
    const result = await employeeService.updateEmployee(approvingEmployeeId, { status: 'active' as any })
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Duyệt thất bại",
        description: `Không thể duyệt nhân viên. Lỗi: ${result.error}`,
      })
    } else {
      toast({
        title: "Duyệt thành công",
        description: "Tài khoản nhân viên đã được kích hoạt.",
      })
      fetchData() // Refresh data
    }
    setIsApprovalAlertOpen(false)
    setApprovingEmployeeId(null)
  }
  
  const onSubmit = async (values: EmployeeFormData & { password?: string }) => {
    setIsSubmitting(true)
    setFormError(null) // Clear previous errors
    
    try {
      let result;
      if (editingEmployee) {
        // Update logic
        const updateValues = { ...values } as any;
        if ("password" in updateValues) {
          delete updateValues.password; // Không gửi password nếu không thay đổi
        }
        if (!values.password) {
            delete updateValues.password;
        }
        result = await employeeService.updateEmployee(editingEmployee.id, updateValues)
      } else {
        // Create logic
        const createValues = { ...values } as any
        result = await employeeService.createEmployee(createValues)
      }

      if (result.error) {
        setFormError(result.error)
        toast({
          variant: "destructive",
          title: editingEmployee ? "Cập nhật thất bại" : "Tạo mới thất bại",
          description: `Không thể ${editingEmployee ? "cập nhật" : "tạo"} nhân viên. Lỗi: ${result.error}`,
        })
      } else {
        // Success - close form and refresh data
        fetchData()
        setIsSheetOpen(false)
        setFormError(null)
        toast({
          title: editingEmployee ? "Cập nhật nhân viên thành công" : "Tạo nhân viên thành công",
          description: editingEmployee
            ? `Đã cập nhật thông tin cho ${editingEmployee.name}.`
            : `Đã thêm nhân viên mới: ${values.name}.`,
        })
        // Return created id for queued document uploads
        if (!editingEmployee && result.data?.id) {
          return { id: result.data.id }
        }
      }
    } catch (error) {
      setFormError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.")
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleView = (employee: Employee) => {
    setViewingEmployee(employee);
    setIsViewSheetOpen(true);
    setOpenDropdownId(null);
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormError(null)
    form.reset({
      ...employee,
      password: '', // Không hiển thị password cũ
      phone: employee.phone ?? undefined,
      birth_date: employee.birth_date ?? undefined,
      department_id: employee.department_id ?? undefined,
      position_id: employee.position_id ?? undefined,
      manager_id: employee.manager_id ?? undefined,
    });
    setIsSheetOpen(true)
    setOpenDropdownId(null);
  }

  const handleDelete = (id: string) => {
    setDeletingEmployeeId(id)
    setIsAlertOpen(true)
    setOpenDropdownId(null);
  }

  const handleApprove = (id: string) => {
    setApprovingEmployeeId(id)
    setIsApprovalAlertOpen(true)
    setOpenDropdownId(null);
  }

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment =
      selectedDepartments.length === 0 ||
      (employee.department_id && selectedDepartments.includes(employee.department_id))

    const matchesPosition =
      selectedPositions.length === 0 ||
      (employee.position_id && selectedPositions.includes(employee.position_id))

    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(employee.status as string)

    return matchesSearch && matchesDepartment && matchesPosition && matchesStatus
  })

  const getDepartmentName = (deptId?: string) => departments.find(d => d.id === deptId)?.name || 'N/A'
  const getPositionName = (posId?: string) => positions.find(p => p.id === posId)?.name || 'N/A'
  const getManagerName = (managerId?: string) => employees.find(e => e.id === managerId)?.name || "Không có"
  
  // Status label mapping
  const getStatusLabel = (status: string) => {
    const statusMap = {
      'invite_sent': 'Đã gửi lời mời',
      'pending': 'Chờ hoàn thiện hồ sơ',
      'active': 'Đang làm việc',
      'inactive': 'Tạm nghỉ',
      'terminated': 'Đã nghỉ việc',
      'probation': 'Đang thử việc'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  // Options for multi-select filters
  const departmentOptions: MultiSelectOption[] = departments.map(d => ({ label: d.name, value: d.id }))
  const positionOptions: MultiSelectOption[] = positions.map(p => ({ label: p.name, value: p.id }))
  const statusOptions: MultiSelectOption[] = [
    { label: getStatusLabel('invite_sent'), value: 'invite_sent' },
    { label: getStatusLabel('pending'), value: 'pending' },
    { label: getStatusLabel('active'), value: 'active' },
    { label: getStatusLabel('inactive'), value: 'inactive' },
    { label: getStatusLabel('terminated'), value: 'terminated' },
    { label: getStatusLabel('probation'), value: 'probation' },
  ]

  // Dòng gỡ lỗi để kiểm tra dữ liệu
  //console.log("Positions State:", positions);

  return (
    <>
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý nhân viên</h1>
            <p className="text-muted-foreground">Thêm, sửa, xóa và xem thông tin nhân viên.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm nhân viên
          </Button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm theo tên, mã, email..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
          <div className="w-full sm:w-72">
            <MultiSelect
              value={selectedDepartments}
              onChange={setSelectedDepartments}
              options={departmentOptions}
              placeholder="Lọc theo phòng ban..."
              emptyText="Không có phòng ban nào"
              maxDisplay={1}
              side="bottom"
              align="end"
            />
          </div>
          <div className="w-full sm:w-72">
            <MultiSelect
              value={selectedPositions}
              onChange={setSelectedPositions}
              options={positionOptions}
              placeholder="Lọc theo chức vụ..."
              emptyText="Không có chức vụ nào"
              maxDisplay={1}
              side="bottom"
              align="end"
            />
          </div>
          <div className="w-full sm:w-72">
            <MultiSelect
              value={selectedStatuses}
              onChange={setSelectedStatuses}
              options={statusOptions}
              placeholder="Lọc theo trạng thái..."
              emptyText="Không có trạng thái phù hợp"
              maxDisplay={1}
              side="bottom"
              align="end"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="mr-2 h-4 w-4" /> Cột
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={!!visibleColumns.name} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, name: !!v })}>Tên</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.code} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, code: !!v })}>Mã NV</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.department} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, department: !!v })}>Phòng ban</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.position} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, position: !!v })}>Chức vụ</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.baseSalary} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, baseSalary: !!v })}>Lương cơ bản</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.status} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, status: !!v })}>Trạng thái</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.actions} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, actions: !!v })}>Thao tác</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || selectedDepartments.length > 0 || selectedPositions.length > 0 || selectedStatuses.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Bộ lọc đang áp dụng:</span>

            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Tìm kiếm: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedDepartments.map(deptId => {
              const dept = departments.find(d => d.id === deptId)
              return dept ? (
                <Badge key={deptId} variant="secondary" className="gap-1">
                  Phòng ban: {dept.name}
                  <button
                    onClick={() => setSelectedDepartments(prev => prev.filter(id => id !== deptId))}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null
            })}

            {selectedPositions.map(posId => {
              const pos = positions.find(p => p.id === posId)
              return pos ? (
                <Badge key={posId} variant="secondary" className="gap-1">
                  Chức vụ: {pos.name}
                  <button
                    onClick={() => setSelectedPositions(prev => prev.filter(id => id !== posId))}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null
            })}

            {selectedStatuses.map(status => (
              <Badge key={status} variant="secondary" className="gap-1">
                Trạng thái: {getStatusLabel(status)}
                <button
                  onClick={() => setSelectedStatuses(prev => prev.filter(s => s !== status))}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setSelectedDepartments([])
                setSelectedPositions([])
                setSelectedStatuses([])
              }}
              className="text-xs h-6 px-2"
            >
              Xóa tất cả
            </Button>
          </div>
        )}
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Danh sách nhân viên</CardTitle>
          <CardDescription>Tổng cộng {filteredEmployees.length} nhân viên</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
              </div>
            ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                      {visibleColumns.name && <TableHead>Tên</TableHead>}
                      {visibleColumns.code && <TableHead>Mã NV</TableHead>}
                      {visibleColumns.department && <TableHead>Phòng ban</TableHead>}
                      {visibleColumns.position && <TableHead>Chức vụ</TableHead>}
                      {visibleColumns.baseSalary && <TableHead>Lương cơ bản</TableHead>}
                      {visibleColumns.status && <TableHead>Trạng thái</TableHead>}
                      {visibleColumns.actions && <TableHead className="text-right">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    {visibleColumns.name && (<TableCell className="font-medium">{employee.name}</TableCell>)}
                    {visibleColumns.code && (<TableCell>{employee.employee_code}</TableCell>)}
                    {visibleColumns.department && (<TableCell>{getDepartmentName(employee.department_id)}</TableCell>)}
                    {visibleColumns.position && (<TableCell>{getPositionName(employee.position_id)}</TableCell>)}
                    {visibleColumns.baseSalary && (<TableCell>{formatCurrency(employee.base_salary)}</TableCell>)}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge variant={employee.status === "active" ? "default" : employee.status === 'terminated' ? 'destructive' : 'secondary'}>
                          {getStatusLabel(employee.status)}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="text-right">
                        <DropdownMenu 
                          open={openDropdownId === employee.id} 
                          onOpenChange={(open) => setOpenDropdownId(open ? employee.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {employee.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleApprove(employee.id)}>
                                <Check className="h-4 w-4" /> Duyệt
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleView(employee)}>
                              <Eye className="h-4 w-4" /> Xem
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Edit className="h-4 w-4" /> Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(employee.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" /> Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
            )}
        </CardContent>
      </Card>
                      </div>
      
      {/* Add/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-4xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEmployee ? "Chỉnh sửa thông tin" : "Thêm nhân viên mới"}</SheetTitle>
            <SheetDescription>
              {editingEmployee ? `Cập nhật hồ sơ cho ${editingEmployee.name}.` : "Nhập thông tin chi tiết để tạo nhân viên mới."}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <EmployeeForm
              departments={departments}
              positions={positions}
              employees={employees}
              onSubmit={onSubmit}
              onCancel={() => setIsSheetOpen(false)}
              initialData={editingEmployee || undefined}
              isSubmitting={isSubmitting}
              error={formError || undefined}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* View Employee Sheet */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="sm:max-w-3xl w-full overflow-y-auto">
          {viewingEmployee && (
            <>
              <SheetHeader>
                <SheetTitle>Chi tiết nhân viên</SheetTitle>
                <SheetDescription>Thông tin chi tiết của {viewingEmployee.name}.</SheetDescription>
              </SheetHeader>
              <EmployeeViewSheet
                employee={viewingEmployee}
                formatCurrency={formatCurrency}
                getDepartmentName={getDepartmentName}
                getPositionName={getPositionName}
                getManagerName={getManagerName}
                getStatusLabel={getStatusLabel}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn nhân viên và tài khoản đăng nhập của họ. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={isApprovalAlertOpen} onOpenChange={setIsApprovalAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn duyệt?</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận thông tin nhân viên và chuyển nhân viên sang trạng thái đang làm việc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} className="bg-green-600 hover:bg-green-700">Duyệt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function EmployeesPage() {
  return (
    <AuthGuard allowedDbRoles={["admin","hr"]} redirectTo="/forbidden">
      <EmployeesPageInner />
    </AuthGuard>
  )
}
