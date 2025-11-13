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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Eye, Edit, Trash2, Briefcase, X, MoreVertical, Settings2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { positionService, departmentService } from "@/lib/services"
import type { Position, Department } from "@/lib/services"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { PositionForm } from "@/components/position-form"
import type { PositionFormData } from "@/components/position-form"
import { PositionViewSheet } from "@/components/position-view-sheet"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { useCookies } from "@/hooks/use-cookies"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function PositionsPage() {
  const { t } = useLanguage()
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  
  // States for dialogs/sheets
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [deletingPositionId, setDeletingPositionId] = useState<string | null>(null)
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
  const [viewingPosition, setViewingPosition] = useState<Position | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useCookies<Record<string, boolean>>("positions_table_columns", {
    name: true,
    department: true,
    description: true,
    updatedAt: true,
    actions: true,
  })
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch both positions and departments
      const [positionsRes, departmentsRes] = await Promise.all([
        positionService.getPositions(),
        departmentService.getDepartments()
      ])
      
      if (positionsRes.data) {
        setPositions(positionsRes.data)
      } else {
        toast({
          title: "Lỗi",
          description: positionsRes.error || "Không thể tải danh sách chức vụ",
          variant: "destructive",
        })
      }
      
      if (departmentsRes.data) {
        setDepartments(departmentsRes.data)
      } else {
        toast({
          title: "Lỗi",
          description: departmentsRes.error || "Không thể tải danh sách phòng ban",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error)
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi tải dữ liệu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter positions based on search term and selected departments
  const filteredPositions = positions.filter(pos => {
    const matchesSearch = pos.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartments.length === 0 || 
      (pos.department_id && selectedDepartments.includes(pos.department_id))
    return matchesSearch && matchesDepartment
  })

  // Department options for filter
  const departmentOptions: MultiSelectOption[] = departments.map(dept => ({
    label: dept.name,
    value: dept.id
  }))

  // Helper functions
  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return "N/A"
    const dept = departments.find(d => d.id === deptId)
    return dept?.name || "N/A"
  }


  const handleAddNew = () => {
    setEditingPosition(null)
    setFormError(null)
    setIsSheetOpen(true)
  }

  const handleView = (position: Position) => {
    setViewingPosition(position)
    setIsViewSheetOpen(true)
    setOpenDropdownId(null)
  }

  const handleEdit = (position: Position) => {
    setEditingPosition(position)
    setFormError(null)
    setIsSheetOpen(true)
    setOpenDropdownId(null)
  }

  const handleDelete = (position: Position) => {
    setDeletingPositionId(position.id)
    setIsAlertOpen(true)
    setOpenDropdownId(null)
  }

  const onSubmit = async (data: PositionFormData) => {
    setIsSubmitting(true)
    setFormError(null) // Clear previous errors

    try {
      let result;
      if (editingPosition) {
        // Update existing position
        result = await positionService.updatePosition(editingPosition.id, data)
      } else {
        // Create new position
        result = await positionService.createPosition(data)
      }

      if (result.error) {
        setFormError(result.error)
        toast({
          variant: "destructive",
          title: editingPosition ? "Cập nhật thất bại" : "Tạo mới thất bại",
          description: `Không thể ${editingPosition ? "cập nhật" : "tạo"} chức vụ. Lỗi: ${result.error}`,
        })
      } else {
        // Success - close form and refresh data
        console.log(`✅ Database ${editingPosition ? 'UPDATE' : 'CREATE'} successful:`, data)
        toast({
          title: editingPosition ? "Cập nhật chức vụ thành công" : "Tạo chức vụ thành công",
          description: editingPosition
            ? "Chức vụ đã được cập nhật thành công."
            : "Chức vụ mới đã được tạo thành công.",
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
    if (!deletingPositionId) return

    const result = await positionService.deletePosition(deletingPositionId)
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Xóa chức vụ thất bại",
        description: `Không thể xóa chức vụ. Lỗi: ${result.error}`,
      })
    } else {
      console.log("✅ Database DELETE successful for position ID:", deletingPositionId)
      toast({
        title: "Xóa chức vụ thành công",
        description: "Chức vụ đã được xóa khỏi hệ thống.",
      })
      fetchData() // Refresh data
    }
    setIsAlertOpen(false)
    setDeletingPositionId(null)
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
            <h1 className="text-3xl font-bold tracking-tight">Quản lý chức vụ</h1>
            <p className="text-muted-foreground">Thêm, sửa, xóa và xem thông tin chức vụ.</p>
        </div>
          <div className="flex gap-2">
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm chức vụ
            </Button>
          </div>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm theo tên chức vụ..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
          <div className="w-full sm:w-80">
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
                <DropdownMenuCheckboxItem checked={!!visibleColumns.name} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, name: !!v })}>Tên chức vụ</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.department} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, department: !!v })}>Phòng ban</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.description} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, description: !!v })}>Mô tả</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.updatedAt} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, updatedAt: !!v })}>Cập nhật gần nhất</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={!!visibleColumns.actions} onCheckedChange={(v) => setVisibleColumns({ ...visibleColumns, actions: !!v })}>Thao tác</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(searchTerm || selectedDepartments.length > 0) && (
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
                  {dept.name}
                  <button
                    onClick={() => setSelectedDepartments(prev => prev.filter(id => id !== deptId))}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null
            })}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setSelectedDepartments([])
              }}
              className="text-xs h-6 px-2"
            >
              Xóa tất cả
            </Button>
          </div>
        )}
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Danh sách chức vụ
          </CardTitle>
          <CardDescription>
            Tổng cộng {filteredPositions.length} chức vụ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.name && <TableHead>Tên chức vụ</TableHead>}
                {visibleColumns.department && <TableHead>Phòng ban</TableHead>}
                {visibleColumns.description && <TableHead>Mô tả</TableHead>}
                {visibleColumns.updatedAt && <TableHead>Cập nhật gần nhất</TableHead>}
                {visibleColumns.actions && <TableHead className="text-right">Thao tác</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8 text-muted-foreground">
                    {searchTerm || selectedDepartments.length > 0 ? "Không tìm thấy chức vụ nào phù hợp với bộ lọc" : "Chưa có chức vụ nào"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPositions.map((position) => (
                  <TableRow key={position.id}>
                    {visibleColumns.name && <TableCell className="font-medium">{position.name}</TableCell>}
                    {visibleColumns.department && <TableCell>{getDepartmentName(position.department_id)}</TableCell>}
                    {visibleColumns.description && (
                      <TableCell className="max-w-xs truncate">
                        {position.description || "Không có mô tả"}
                      </TableCell>
                    )}
                    {visibleColumns.updatedAt && (
                      <TableCell>
                        {position.updated_at 
                          ? new Date(position.updated_at).toLocaleDateString('vi-VN')
                          : "N/A"
                        }
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="text-right">
                        <DropdownMenu
                          open={openDropdownId === position.id}
                          onOpenChange={(open) => setOpenDropdownId(open ? position.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(position)}>
                              <Eye className="h-4 w-4" /> Xem
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(position)}>
                              <Edit className="h-4 w-4" /> Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(position)} className="text-destructive">
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

    {/* Add/Edit Position Sheet */}
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
        <SheetHeader>
            <SheetTitle>{editingPosition ? "Chỉnh sửa thông tin" : "Thêm chức vụ mới"}</SheetTitle>
            <SheetDescription>
              {editingPosition ? `Cập nhật thông tin cho ${editingPosition.name}.` : "Nhập thông tin để tạo chức vụ mới."}
            </SheetDescription>
          </SheetHeader>
        <div className="py-4">          
          <PositionForm
            departments={departments}
            onSubmit={onSubmit}
            onCancel={() => setIsSheetOpen(false)}
            initialData={editingPosition || undefined}
            isSubmitting={isSubmitting}
            error={formError || undefined}
          />
        </div>
      </SheetContent>
    </Sheet>

    {/* View Position Sheet */}
    <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
      <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
        <div className="p-6">
          {viewingPosition && (
            <>         
              <SheetHeader>
              <SheetTitle>Thông tin chức vụ</SheetTitle>
              <SheetDescription>Thông tin chi tiết của {viewingPosition.name}</SheetDescription>
            </SheetHeader>
            <PositionViewSheet 
              position={viewingPosition} 
              getDepartmentName={getDepartmentName}
            />
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
            Bạn có chắc chắn muốn xóa chức vụ này không? Hành động này không thể hoàn tác.
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
