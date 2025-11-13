"use client"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  Sheet, SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Eye, Edit, Trash2, Building, MoreVertical, Settings2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { departmentService } from "@/lib/services"
import type { Department } from "@/lib/services"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { DepartmentForm } from "@/components/department-form"
import type { DepartmentFormData } from "@/components/department-form"
import { DepartmentViewSheet } from "@/components/department-view-sheet"
import { useCookies } from "@/hooks/use-cookies"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function DepartmentsPage() {
  const { t } = useLanguage()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  
  // States for dialogs/sheets
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null)
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useCookies<Record<string, boolean>>("departments_table_columns", {
    name: true,
    description: true,
    updatedAt: true,
    actions: true,
  })
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await departmentService.getDepartments()
      if (res.data) {
        setDepartments(res.data)
      } else {
        toast({
          title: "Lỗi",
          description: res.error || "Không thể tải danh sách phòng ban",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Error fetching departments:", error)
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi tải danh sách phòng ban",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = () => {
    setEditingDepartment(null)
    setFormError(null)
    setIsSheetOpen(true)
  }

  const handleView = (department: Department) => {
    setViewingDepartment(department)
    setIsViewSheetOpen(true)
    setOpenDropdownId(null) // Close dropdown
  }

  const handleEdit = (department: Department) => {
    setEditingDepartment(department)
    setFormError(null)
    setIsSheetOpen(true)
    setOpenDropdownId(null) // Close dropdown
  }

  const handleDelete = (department: Department) => {
    setDeletingDepartmentId(department.id)
    setIsAlertOpen(true)
    setOpenDropdownId(null) // Close dropdown
  }

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true)
    setFormError(null) // Clear previous errors

    try {
      let result;
      if (editingDepartment) {
        // Update existing department
        result = await departmentService.updateDepartment(editingDepartment.id, data)
      } else {
        // Create new department
        result = await departmentService.createDepartment(data)
      }

      if (result.error) {
        setFormError(result.error)
        toast({
          variant: "destructive",
          title: editingDepartment ? "Cập nhật thất bại" : "Tạo mới thất bại",
          description: `Không thể ${editingDepartment ? "cập nhật" : "tạo"} phòng ban. Lỗi: ${result.error}`,
        })
      } else {
        // Success - close form and refresh data
        console.log(`✅ Database ${editingDepartment ? 'UPDATE' : 'CREATE'} successful:`, data)
        toast({
          title: editingDepartment ? "Cập nhật phòng ban thành công" : "Tạo phòng ban thành công",
          description: editingDepartment
            ? "Phòng ban đã được cập nhật thành công."
            : "Phòng ban mới đã được tạo thành công.",
        })
        fetchData()
        setIsSheetOpen(false)
        setFormError(null)
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

  const confirmDelete = async () => {
    if (!deletingDepartmentId) return

    const result = await departmentService.deleteDepartment(deletingDepartmentId)
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Xóa phòng ban thất bại",
        description: `Không thể xóa phòng ban. Lỗi: ${result.error}`,
      })
    } else {
      console.log("✅ Database DELETE successful for department ID:", deletingDepartmentId)
      toast({
        title: "Xóa phòng ban thành công",
        description: "Phòng ban đã được xóa khỏi hệ thống.",
      })
      fetchData() // Refresh data
    }
    setIsAlertOpen(false)
    setDeletingDepartmentId(null)
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <>
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý phòng ban</h1>
            <p className="text-muted-foreground">Thêm, sửa, xóa và xem thông tin phòng ban.</p>
        </div>
          <div className="flex gap-2">
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm phòng ban
            </Button>
          </div>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm theo tên phòng ban..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
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
                <DropdownMenuCheckboxItem checked={!!visibleColumns.name} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, name: !!v })}>Tên phòng ban</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.description} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, description: !!v })}>Mô tả</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.updatedAt} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, updatedAt: !!v })}>Cập nhật gần nhất</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.actions} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, actions: !!v })}>Thao tác</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Danh sách phòng ban
          </CardTitle>
          <CardDescription>
            Tổng cộng {filteredDepartments.length} phòng ban
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.name && <TableHead>Tên phòng ban</TableHead>}
                {visibleColumns.description && <TableHead>Mô tả</TableHead>}
                {visibleColumns.updatedAt && <TableHead>Cập nhật gần nhất</TableHead>}
                {visibleColumns.actions && <TableHead className="text-right">Thao tác</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Không tìm thấy phòng ban nào" : "Chưa có phòng ban nào"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((department) => (
                  <TableRow key={department.id}>
                    {visibleColumns.name && <TableCell className="font-medium">{department.name}</TableCell>}
                    {visibleColumns.description && (
                      <TableCell className="max-w-xs truncate">
                        {department.description || "Không có mô tả"}
                      </TableCell>
                    )}
                    {visibleColumns.updatedAt && (
                      <TableCell>
                        {department.updated_at 
                          ? new Date(department.updated_at).toLocaleDateString('vi-VN')
                          : "N/A"
                        }
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="text-right">
                        <DropdownMenu
                          open={openDropdownId === department.id}
                          onOpenChange={(open) => setOpenDropdownId(open ? department.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(department)}>
                              <Eye className="h-4 w-4" /> Xem
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(department)}>
                              <Edit className="h-4 w-4" /> Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(department)} className="text-destructive">
                              <Trash2 className="h-4 w-4" /> Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    {/* Add/Edit Department Sheet */}
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
        <SheetHeader>
            <SheetTitle>{editingDepartment ? "Chỉnh sửa thông tin" : "Thêm phòng ban mới"}</SheetTitle>
            <SheetDescription>
              {editingDepartment ? `Cập nhật thông tin cho ${editingDepartment.name}.` : "Nhập thông tin để tạo phòng ban mới."}
            </SheetDescription>
          </SheetHeader>
        <div className="py-4">          
          <DepartmentForm
            onSubmit={onSubmit}
            onCancel={() => setIsSheetOpen(false)}
            initialData={editingDepartment || undefined}
            isSubmitting={isSubmitting}
            error={formError || undefined}
          />
        </div>
      </SheetContent>
    </Sheet>

    {/* View Department Sheet */}
    <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
      <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
        <div className="p-6">
          {viewingDepartment && (
            <>         
              <SheetHeader>
              <SheetTitle>Thông tin phòng ban</SheetTitle>
              <SheetDescription>Thông tin chi tiết của {viewingDepartment.name}</SheetDescription>
            </SheetHeader>
            <DepartmentViewSheet department={viewingDepartment} />
            </>   
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa phòng ban này không? Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
