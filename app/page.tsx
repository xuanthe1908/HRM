"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, Calendar, TrendingUp, PieChart, BarChart3, Clock, Receipt, Building, CalendarDays, Wallet, Bell, CheckCircle, Target, AlertCircle, UserCheck, UserX, TrendingDown, Activity, FileText, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { employeeService, departmentService, attendanceService, notificationService } from "@/lib/services"
import type { Employee, Department } from "@/lib/services"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/utils/currency"


// Dashboard cho HR/Admin
function HRDashboard() {
  const { formatCurrencyShort, t } = useLanguage()
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    totalSalary: 0,
    attendanceToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    totalOvertimeHours: 0,
    pendingLeaveRequests: 0,
    approvedLeaveThisMonth: 0,
    totalPositiveBalance: 0,
    totalNegativeBalance: 0,
    employeesWithNegativeBalance: 0,
    recentNotifications: 0
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [balanceStats, setBalanceStats] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()

        // Fetch basic data
        const [empResponse, deptResponse] = await Promise.all([
          employeeService.getEmployees(),
          departmentService.getDepartments(),
        ]);
  
        let employees = empResponse?.data || []
        let departments = deptResponse?.data || []
        
        setEmployees(employees);
        setDepartments(departments);
        
        // Get token for authenticated requests
        const token = localStorage.getItem('access_token')
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}
        
        // Fetch advanced data
        const [attendanceResponse, balanceStatsResponse, notificationsResponse] = await Promise.all([
          attendanceService.getAttendanceSummary(currentMonth, currentYear).catch(() => ({ data: [] })),
          fetch('/api/employee-balance/statistics', {
            headers: authHeaders
          }).then(res => res.ok ? res.json() : null).catch(() => null),
          notificationService.getNotifications().catch(() => ({ data: [] }))
        ]);

        const attendanceData = attendanceResponse?.data || []
        const balanceStats = balanceStatsResponse
        const notifications = notificationsResponse?.data || []

        setAttendanceData(attendanceData)
        setBalanceStats(balanceStats)
        setNotifications(notifications)

        // Calculate attendance stats
        const todayStr = currentDate.toISOString().split('T')[0]
        const totalActiveEmployees = employees.filter(emp => emp.status === 'active').length
        const presentToday = attendanceData.filter(att => att.total_present_days > 0).length
        const absentToday = Math.max(0, totalActiveEmployees - presentToday)
        const attendanceRate = totalActiveEmployees > 0 ? (presentToday / totalActiveEmployees) * 100 : 0
        const totalOvertimeHours = attendanceData.reduce((sum, att) => sum + (att.total_overtime_hours || 0), 0)

        // Update comprehensive stats
        setStats({
          totalEmployees: employees.length,
          totalDepartments: departments.length,
          totalSalary: employees.reduce((acc, emp) => acc + (emp.base_salary || 0), 0),
          attendanceToday: presentToday,
          absentToday: absentToday,
          attendanceRate: Math.round(attendanceRate),
          totalOvertimeHours: totalOvertimeHours,
          pendingLeaveRequests: 0, // Would need a leave requests API
          approvedLeaveThisMonth: 0, // Would need a leave requests API  
          totalPositiveBalance: balanceStats?.totalPositiveAmount || 0,
          totalNegativeBalance: balanceStats?.totalNegativeAmount || 0,
          employeesWithNegativeBalance: balanceStats?.negativeBalance || 0,
          recentNotifications: notifications.length
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData()
  }, [])

  const salaryByDept = departments.map(dept => {
    const deptEmps = employees.filter(emp => emp.department_id === dept.id);
    return {
      name: dept.name,
      count: deptEmps.length,
      avgSalary: deptEmps.length > 0 ? deptEmps.reduce((acc, emp) => acc + (emp.base_salary || 0), 0) / deptEmps.length : 0,
    }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Quản lý</h1>
          <p className="text-muted-foreground">Tổng quan hoạt động công ty và nhân sự</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Activity className="h-4 w-4 mr-1" />
          Cập nhật realtime
        </Badge>
      </div>

      {/* Main Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Employees */}
        <Link href="/employees">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {employees.filter(emp => emp.status === 'active').length} đang hoạt động
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Attendance Today */}
        <Link href="/attendance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chấm công hôm nay</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.attendanceToday}</div>
              <p className="text-xs text-muted-foreground">
                {stats.absentToday} vắng mặt • {stats.attendanceRate}% tỷ lệ
              </p>
          </CardContent>
        </Card>
        </Link>

        {/* Total Salary */}
        <Link href="/payroll">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng quỹ lương</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyShort(stats.totalSalary)}</div>
              <p className="text-xs text-muted-foreground">Lương cơ bản/tháng</p>
            </CardContent>
          </Card>
        </Link>

        {/* Overtime Hours */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giờ làm thêm</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalOvertimeHours}h</div>
            <p className="text-xs text-muted-foreground">Tháng hiện tại</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Employee Balance Positive */}
        <Link href="/employee-balances">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số dư dương</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrencyShort(stats.totalPositiveBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Tổng ứng trước</p>
            </CardContent>
          </Card>
        </Link>

        {/* Employee Balance Negative */}
        <Link href="/employee-balances">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cần thanh toán</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrencyShort(stats.totalNegativeBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.employeesWithNegativeBalance} nhân viên
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Departments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phòng ban</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Link href="/notifications">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thông báo</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentNotifications}</div>
              <p className="text-xs text-muted-foreground">Gần đây</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts and Detailed Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Department Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ nhân sự theo phòng ban</CardTitle>
            <CardDescription>Số lượng nhân viên và lương trung bình</CardDescription>
          </CardHeader>
          <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart data={salaryByDept} width={400} height={300}>
                  <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" name="Số nhân viên" />
                <Bar dataKey="avgSalary" fill="hsl(var(--chart-2))" name="Lương TB" />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>Nhân viên xuất sắc tháng này</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.employee_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.total_present_days || 0} ngày • {item.total_overtime_hours || 0}h OT
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {Math.round(((item.total_present_days || 0) / 22) * 100)}%
                  </Badge>
                </div>
              ))}
              {attendanceData.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Chưa có dữ liệu chấm công</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 4).map((notification, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Không có thông báo mới</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Thao tác nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/employees" className="block">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Quản lý nhân viên</p>
                      <p className="text-xs text-muted-foreground">Xem, thêm, sửa thông tin</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <Link href="/attendance" className="block">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Chấm công</p>
                      <p className="text-xs text-muted-foreground">Xem báo cáo chấm công</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <Link href="/employee-balances" className="block">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Quản lý số dư</p>
                      <p className="text-xs text-muted-foreground">Xem số dư nhân viên</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <Link href="/payroll" className="block">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Tính lương</p>
                      <p className="text-xs text-muted-foreground">Tính và xuất bảng lương</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
  )
}

// Dashboard cho nhân viên
function EmployeeDashboard() {
  const { user, loading } = useAuth()
  const { formatCurrencyShort, t } = useLanguage()

  const [dashboardData, setDashboardData] = useState({
    attendanceThisMonth: null,
    leaveBalance: null,
    employeeBalance: null,
    notifications: [],
    loadingData: true
  })

  useEffect(() => {
    if (user?.id) {
      loadEmployeeDashboardData()
    }
  }, [user?.id])

  const loadEmployeeDashboardData = async () => {
    if (!user?.id) return
    
    try {
      setDashboardData(prev => ({ ...prev, loadingData: true }))
      
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      // Lấy dữ liệu chấm công tháng hiện tại
      const attendancePromise = attendanceService.getAttendanceSummary(currentMonth, currentYear)
        .then(response => {
          const data = response.data
          return data?.find((item: any) => item.employee_id === user.id) || null
        })
        .catch(error => {
          console.error('Error loading attendance:', error)
          return null
        })

      // Get token for authenticated requests
      const token = localStorage.getItem('access_token')
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Lấy thông tin nghỉ phép
      const leaveBalancePromise = fetch(`/api/leave-balance/${user.id}`, {
        headers: authHeaders
      })
        .then(res => res.ok ? res.json() : null)
        .catch(error => {
          console.error('Error loading leave balance:', error)
          return null
        })

      // Lấy số dư tài chính
      const employeeBalancePromise = fetch(`/api/employee-balance/${user.id}`, {
        headers: authHeaders
      })
        .then(res => res.ok ? res.json() : null)
        .catch(error => {
          console.error('Error loading employee balance:', error)
          return null
        })

      // Lấy thông báo
      const notificationsPromise = notificationService.getNotifications()
        .then(response => response.data?.slice(0, 5) || [])
        .catch(error => {
          console.error('Error loading notifications:', error)
          return []
        })

      const [attendance, leaveBalance, employeeBalance, notifications] = await Promise.all([
        attendancePromise,
        leaveBalancePromise, 
        employeeBalancePromise,
        notificationsPromise
      ])

      setDashboardData({
        attendanceThisMonth: attendance,
        leaveBalance,
        employeeBalance,
        notifications,
        loadingData: false
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setDashboardData(prev => ({ ...prev, loadingData: false }))
    }
  }

  if (!user) return <Skeleton className="h-screen w-full" />

  if (dashboardData.loadingData) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chào, {user.name}!</h1>
            <p className="text-muted-foreground">Đây là trang tổng quan cá nhân của bạn.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { attendanceThisMonth, leaveBalance, employeeBalance, notifications } = dashboardData

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chào, {user.name}!</h1>
          <p className="text-muted-foreground">Đây là trang tổng quan cá nhân của bạn.</p>
        </div>
      </div>
      
      {/* Thông tin tổng quan */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Lương cơ bản */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lương cơ bản</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyShort(user.base_salary || 0)}</div>
            <p className="text-xs text-muted-foreground">Lương hàng tháng</p>
          </CardContent>
        </Card>

        {/* Chấm công tháng này */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chấm công tháng này</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceThisMonth ? `${attendanceThisMonth.total_present_days || 0}` : "0"} ngày
            </div>
            <p className="text-xs text-muted-foreground">
              {attendanceThisMonth && attendanceThisMonth.total_overtime_hours > 0 
                ? `Làm thêm: ${attendanceThisMonth.total_overtime_hours}h` 
                : "Không có giờ làm thêm"}
            </p>
          </CardContent>
        </Card>

        {/* Nghỉ phép còn lại */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nghỉ phép còn lại</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveBalance ? `${leaveBalance.remaining_days}` : "0"} ngày
            </div>
            <p className="text-xs text-muted-foreground">
              {leaveBalance 
                ? `Đã dùng: ${leaveBalance.total_used_days}/${leaveBalance.total_earned_days} ngày`
                : "Chưa có dữ liệu nghỉ phép"}
            </p>
          </CardContent>
        </Card>

        {/* Số dư tài chính */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số dư hiện tại</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employeeBalance ? formatCurrency(employeeBalance.current_balance) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {employeeBalance && employeeBalance.current_balance < 0 
                ? "Cần thanh toán" 
                : employeeBalance && employeeBalance.current_balance > 0 
                  ? "Có thể rút"
                  : "Số dư bằng 0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thông báo gần đây */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Thông báo gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thống kê chi tiết chấm công */}
      {attendanceThisMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Chi tiết chấm công tháng này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Ngày đi làm: <strong>{attendanceThisMonth.total_present_days || 0}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Giờ làm thêm: <strong>{attendanceThisMonth.total_overtime_hours || 0}h</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm">Ngày nghỉ: <strong>{attendanceThisMonth.total_absent_days || 0}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-6"><Skeleton className="h-screen w-full" /></div>;
  }

  // Phân luồng hiển thị dashboard dựa trên role
  if (user?.role === 'admin' || user?.role === 'hr') {
    return <HRDashboard />;
  }
  
  return <EmployeeDashboard />;
}
