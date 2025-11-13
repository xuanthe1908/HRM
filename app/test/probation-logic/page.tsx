"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { employeeService, positionService } from "@/lib/services"
import { useToast } from "@/components/ui/use-toast"

export default function ProbationLogicTestPage() {
  const { toast } = useToast()
  const [positions, setPositions] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Test data
  const [testEmployee, setTestEmployee] = useState({
    name: "Nguyen Van Test",
    email: "test@company.com",
    employee_code: "TV" + Date.now(),
    phone: "0123456789",
    start_date: new Date().toISOString().split('T')[0],
    position_id: "",
    base_salary: 8000000,
    status: "active" as const,
    role: "employee" as const
  })

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [newPositionId, setNewPositionId] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [posRes, empRes] = await Promise.all([
        positionService.getPositions(),
        employeeService.getEmployees()
      ])
      if (posRes.data) setPositions(posRes.data)
      if (empRes.data) setEmployees(empRes.data.filter(emp => emp.status === 'active'))
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const probationPosition = positions.find(p => p.name === "Thử việc")
  const probationEmployees = employees.filter(emp => 
    emp.position && emp.position.name === "Thử việc"
  )

  const handleCreateProbationEmployee = async () => {
    try {
      if (!probationPosition) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy chức vụ 'Thử việc'. Vui lòng tạo chức vụ này trước.",
          variant: "destructive"
        })
        return
      }

      const employeeData = {
        ...testEmployee,
        position_id: probationPosition.id,
        probation_start_date: new Date().toISOString().split('T')[0],
        probation_result: "Đang thử việc"
      }

      const result = await employeeService.createEmployee(employeeData)
      if (result.data) {
        toast({
          title: "Thành công",
          description: "Đã tạo nhân viên thử việc thành công"
        })
        fetchData()
        setTestEmployee({
          ...testEmployee,
          employee_code: "TV" + Date.now()
        })
      } else {
        toast({
          title: "Lỗi",
          description: result.error || "Không thể tạo nhân viên",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating employee:', error)
      toast({
        title: "Lỗi",
        description: "Đã có lỗi xảy ra",
        variant: "destructive"
      })
    }
  }

  const handlePromoteEmployee = async () => {
    try {
      if (!selectedEmployeeId || !newPositionId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn nhân viên và chức vụ mới",
          variant: "destructive"
        })
        return
      }

      const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId)
      if (!selectedEmployee) return

      const updateData = {
        ...selectedEmployee,
        position_id: newPositionId,
        probation_end_date: new Date().toISOString().split('T')[0],
        official_start_date: new Date().toISOString().split('T')[0],
        probation_result: "Đạt"
      }

      const result = await employeeService.updateEmployee(selectedEmployeeId, updateData)
      if (result.data) {
        toast({
          title: "Thành công",
          description: "Đã chuyển nhân viên thành chính thức"
        })
        fetchData()
        setSelectedEmployeeId("")
        setNewPositionId("")
      } else {
        toast({
          title: "Lỗi",
          description: result.error || "Không thể cập nhật nhân viên",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        title: "Lỗi",
        description: "Đã có lỗi xảy ra",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="p-6">Đang tải...</div>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Logic Quản Lý Thử Việc</h1>
        <p className="text-muted-foreground">
          Kiểm tra logic tự động điền thông tin thử việc và chuyển đổi thành nhân viên chính thức
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test 1: Tạo nhân viên thử việc */}
        <Card>
          <CardHeader>
            <CardTitle>Test 1: Tạo nhân viên thử việc</CardTitle>
            <CardDescription>
              Tạo nhân viên mới với chức vụ "Thử việc" và kiểm tra logic tự động
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Tên nhân viên</Label>
                <Input 
                  value={testEmployee.name}
                  onChange={(e) => setTestEmployee({...testEmployee, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={testEmployee.email}
                  onChange={(e) => setTestEmployee({...testEmployee, email: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Mã nhân viên</Label>
                <Input 
                  value={testEmployee.employee_code}
                  onChange={(e) => setTestEmployee({...testEmployee, employee_code: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Lương cơ bản</Label>
                <Input 
                  type="number"
                  value={testEmployee.base_salary}
                  onChange={(e) => setTestEmployee({...testEmployee, base_salary: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-2">Logic tự động sẽ áp dụng:</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>• Chức vụ: "Thử việc"</div>
                <div>• Ngày bắt đầu thử việc: {new Date().toLocaleDateString("vi-VN")}</div>
                <div>• Kết quả thử việc: "Đang thử việc"</div>
                <div>• Ngày chính thức: trống (vì đang thử việc)</div>
              </div>
            </div>

            <Button onClick={handleCreateProbationEmployee} className="w-full">
              Tạo nhân viên thử việc
            </Button>
          </CardContent>
        </Card>

        {/* Test 2: Chuyển thành chính thức */}
        <Card>
          <CardHeader>
            <CardTitle>Test 2: Chuyển thành nhân viên chính thức</CardTitle>
            <CardDescription>
              Chọn nhân viên thử việc và chuyển sang chức vụ khác
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Chọn nhân viên thử việc</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhân viên đang thử việc" />
                  </SelectTrigger>
                  <SelectContent>
                    {probationEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Chọn chức vụ mới</Label>
                <Select value={newPositionId} onValueChange={setNewPositionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chức vụ mới" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.filter(pos => pos.name !== "Thử việc").map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-800 mb-2">Logic tự động sẽ áp dụng:</div>
              <div className="text-xs text-green-700 space-y-1">
                <div>• Ngày kết thúc thử việc: {new Date().toLocaleDateString("vi-VN")}</div>
                <div>• Ngày bắt đầu chính thức: {new Date().toLocaleDateString("vi-VN")}</div>
                <div>• Kết quả thử việc: "Đạt"</div>
                <div>• Chức vụ: chuyển sang chức vụ mới</div>
              </div>
            </div>

            <Button 
              onClick={handlePromoteEmployee} 
              className="w-full"
              disabled={!selectedEmployeeId || !newPositionId}
            >
              Chuyển thành chính thức
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách nhân viên thử việc hiện tại */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách nhân viên đang thử việc</CardTitle>
          <CardDescription>
            {probationEmployees.length} nhân viên đang trong thời gian thử việc
          </CardDescription>
        </CardHeader>
        <CardContent>
          {probationEmployees.length > 0 ? (
            <div className="space-y-3">
              {probationEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-sm text-gray-600">
                      {emp.employee_code} • {emp.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      Thử việc từ: {emp.probation_start_date ? new Date(emp.probation_start_date).toLocaleDateString("vi-VN") : "N/A"}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">Đang thử việc</Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {emp.probation_start_date && 
                        `${Math.floor((Date.now() - new Date(emp.probation_start_date).getTime()) / (1000 * 60 * 60 * 24))} ngày`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Không có nhân viên nào đang thử việc
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Tổng chức vụ</div>
              <div className="text-2xl font-bold text-blue-600">{positions.length}</div>
            </div>
            <div>
              <div className="font-medium">Chức vụ "Thử việc"</div>
              <div className="text-2xl font-bold text-orange-600">
                {probationPosition ? "✓" : "✗"}
              </div>
            </div>
            <div>
              <div className="font-medium">Tổng nhân viên</div>
              <div className="text-2xl font-bold text-green-600">{employees.length}</div>
            </div>
            <div>
              <div className="font-medium">Đang thử việc</div>
              <div className="text-2xl font-bold text-purple-600">{probationEmployees.length}</div>
            </div>
          </div>

          {!probationPosition && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">Chưa có chức vụ "Thử việc"</div>
              <div className="text-xs text-yellow-700 mt-1">
                Vui lòng tạo chức vụ "Thử việc" trước khi test tính năng này.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}