"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Eye, DollarSign, Calendar, Shield, Calculator, TrendingUp, Info, AlertCircle, X, FileText, Printer } from "lucide-react"
import { apiClient } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"

interface SalaryRegulations {
  overtimeWeekdayRate: number;
  overtimeWeekendRate: number;
  [key: string]: any;
}

// Detailed payroll data will be fetched from API

interface PayrollRecord {
  id: number;
  month: string;
  payDate: string;
  status: string;
  basicSalary: number;
  workingDays: number;
  presentDays: number;
  attendanceRate: number;
  actualBasicSalary: number;
  allowances: {
    housing: number;
    transport: number;
    phone: number;
    meal: number;
    attendance: number;
    position: number;
    other: number;
  };
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  
  // Overtime breakdown
  weekdayOvertimeHours?: number;
  weekendOvertimeHours?: number;
  weekdayOvertimePay?: number;
  weekendOvertimePay?: number;
  
  insuranceBase: number;
  employeeInsurance: {
    social: number;
    health: number;
    unemployment: number;
    union: number;
  };
  companyInsurance: {
    social: number;
    health: number;
    unemployment: number;
    union: number;
  };
  taxCalculation: {
    grossIncome: number;
    incomeAfterInsurance: number;
    incomeForTax: number;
    actualMealAllowance: number;
    personalDeduction: number;
    dependentDeduction: number;
    taxableIncome: number;
    incomeTax: number;
  };
  totalDeductions: number;
  netSalary: number;
  dependents: number;
  taxCode: string;
}

export default function EmployeePayrollPage() {
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState("2024")
  const [selectedMonth, setSelectedMonth] = useState<PayrollRecord | null>(null)
  const [viewDetailRecord, setViewDetailRecord] = useState<PayrollRecord | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null) // ID of record being downloaded
  const [salaryRegulations, setSalaryRegulations] = useState<SalaryRegulations | null>(null)
  const { toast } = useToast()
  const { t } = useLanguage()

  // Filter payroll records by selected year
  const filteredPayrollHistory = payrollHistory.filter(record => 
    record.month.includes(selectedYear)
  )

  // Get available years from payroll data
  const availableYears = [...new Set(payrollHistory.map(record => {
    const year = record.month.split(' ').pop() // Extract year from "Tháng X YYYY"
    return year || "2024"
  }))].sort().reverse()

  // Auto-select first month when filtered data changes or year changes
  useEffect(() => {
    if (filteredPayrollHistory.length > 0) {
      // If selectedMonth is not in the filtered year, select the first one
      const isSelectedMonthInYear = selectedMonth && filteredPayrollHistory.some(p => p.id === selectedMonth.id)
      if (!isSelectedMonthInYear) {
        setSelectedMonth(filteredPayrollHistory[0])
      }
    } else {
      setSelectedMonth(null)
    }
  }, [filteredPayrollHistory, selectedYear])

  // Fetch payroll data and salary regulations
  useEffect(() => {
    fetchPayrollData()
    fetchSalaryRegulations()
  }, [])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get('/employee/payroll')
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      const data = (response.data as PayrollRecord[]) || []
      setPayrollHistory(data)
      
      // Set the most recent payroll as selected and auto-select year
      if (data.length > 0) {
        setSelectedMonth(data[0])
        
        // Auto-set year to the most recent year in data
        const mostRecentYear = data[0].month.split(' ').pop() || "2024"
        setSelectedYear(mostRecentYear)
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch payroll data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSalaryRegulations = async () => {
    try {
      const response = await apiClient.get('/salary-regulations')
      if (response.data) {
        setSalaryRegulations(response.data as SalaryRegulations)
      }
    } catch (err) {
      console.error('Error fetching salary regulations:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ"
  }

  // Handle view detail modal
  const handleViewDetail = (record: PayrollRecord) => {
    setViewDetailRecord(record)
  }

  // Handle download payroll slip
  const handleDownloadPayroll = async (record: PayrollRecord) => {
    try {
      setIsDownloading(record.id.toString())
      
      // For now, create a simple HTML export since we don't have PDF API
      const htmlContent = generatePayrollHTML(record)
      
      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `phieu-luong-${record.month.replace(/\s+/g, '-')}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Tải xuống thành công",
        description: `Phiếu lương ${record.month} đã được tải xuống.`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Lỗi tải xuống",
        description: "Không thể tải phiếu lương. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(null)
    }
  }

  // Generate HTML content for payroll slip
  const generatePayrollHTML = (record: PayrollRecord) => {
    const totalAllowances = Object.values(record.allowances).reduce((sum, val) => sum + val, 0)
    const totalEmployeeInsurance = Object.values(record.employeeInsurance).reduce((sum, val) => sum + val, 0)
    
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu Lương ${record.month}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
    .total { font-weight: bold; background-color: #f5f5f5; padding: 10px; }
    .currency { text-align: right; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>PHIẾU LƯƠNG NHÂN VIÊN</h1>
    <h2>${record.month}</h2>
    <p>Ngày trả: ${new Date(record.payDate).toLocaleDateString('vi-VN')}</p>
  </div>
  
  <div class="section">
    <h3>Thông tin cơ bản</h3>
    <div class="row"><span>Lương cơ bản:</span><span class="currency">${formatCurrency(record.basicSalary)}</span></div>
    <div class="row"><span>Số ngày làm việc:</span><span>${record.workingDays} ngày</span></div>
    <div class="row"><span>Số ngày có mặt:</span><span>${record.presentDays} ngày</span></div>
    <div class="row"><span>Lương cơ bản thực tế:</span><span class="currency">${formatCurrency(record.actualBasicSalary)}</span></div>
  </div>

  <div class="section">
    <h3>Phụ cấp</h3>
    <div class="row"><span>Phụ cấp nhà ở:</span><span class="currency">${formatCurrency(record.allowances.housing)}</span></div>
    <div class="row"><span>Phụ cấp đi lại:</span><span class="currency">${formatCurrency(record.allowances.transport)}</span></div>
    <div class="row"><span>Phụ cấp điện thoại:</span><span class="currency">${formatCurrency(record.allowances.phone)}</span></div>
    <div class="row"><span>Phụ cấp ăn uống:</span><span class="currency">${formatCurrency(record.allowances.meal)}</span></div>
    <div class="row"><span>Phụ cấp chuyên cần:</span><span class="currency">${formatCurrency(record.allowances.attendance)}</span></div>
    <div class="row"><span>Phụ cấp chức vụ:</span><span class="currency">${formatCurrency(record.allowances.position)}</span></div>
    <div class="row total"><span>Tổng phụ cấp:</span><span class="currency">${formatCurrency(totalAllowances)}</span></div>
  </div>

  <div class="section">
    <h3>Làm thêm giờ</h3>
    <div class="row"><span>Số công:</span><span>${(record.overtimeHours / 8).toFixed(1)} công</span></div>
    <div class="row"><span>Tỷ lệ:</span><span>${record.overtimeRate}%</span></div>
    <div class="row"><span>Tiền làm thêm:</span><span class="currency">${formatCurrency(record.overtimePay)}</span></div>
  </div>

  <div class="section">
    <h3>Bảo hiểm nhân viên đóng</h3>
    <div class="row"><span>BHXH (8%):</span><span class="currency">${formatCurrency(record.employeeInsurance.social)}</span></div>
    <div class="row"><span>BHYT (1.5%):</span><span class="currency">${formatCurrency(record.employeeInsurance.health)}</span></div>
    <div class="row"><span>BHTN (1%):</span><span class="currency">${formatCurrency(record.employeeInsurance.unemployment)}</span></div>
    <div class="row total"><span>Tổng BH nhân viên:</span><span class="currency">${formatCurrency(totalEmployeeInsurance)}</span></div>
  </div>

  <div class="section">
    <h3>Thuế thu nhập cá nhân</h3>
    <div class="row"><span>Tổng thu nhập:</span><span class="currency">${formatCurrency(record.taxCalculation.grossIncome)}</span></div>
    <div class="row"><span>Thu nhập sau BH:</span><span class="currency">${formatCurrency(record.taxCalculation.incomeAfterInsurance)}</span></div>
    <div class="row"><span>- Phụ cấp ăn trưa:</span><span class="currency">${formatCurrency(record.taxCalculation.actualMealAllowance)}</span></div>
    <div class="row" style="border-top: 1px solid #333; font-weight: bold;"><span>Thu nhập tính thuế:</span><span class="currency">${formatCurrency(record.taxCalculation.incomeForTax)}</span></div>
    <div class="row"><span>Giảm trừ bản thân:</span><span class="currency">${formatCurrency(record.taxCalculation.personalDeduction)}</span></div>
    <div class="row"><span>Giảm trừ người phụ thuộc:</span><span class="currency">${formatCurrency(record.taxCalculation.dependentDeduction)}</span></div>
    <div class="row"><span>Thu nhập chịu thuế:</span><span class="currency">${formatCurrency(record.taxCalculation.taxableIncome)}</span></div>
    <div class="row total"><span>Thuế TNCN:</span><span class="currency">${formatCurrency(record.taxCalculation.incomeTax)}</span></div>
  </div>

  <div class="section total" style="font-size: 18px; color: #2563eb;">
    <div class="row"><span>TỔNG KHẤU TRỪ:</span><span class="currency">${formatCurrency(record.totalDeductions)}</span></div>
    <div class="row" style="font-size: 20px; color: #16a34a;"><span>THỰC LĨNH:</span><span class="currency">${formatCurrency(record.netSalary)}</span></div>
  </div>

  <div style="margin-top: 40px; text-align: center; font-style: italic;">
    <p>Phiếu lương được tạo tự động từ hệ thống HRM</p>
    <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
  </div>
</body>
</html>`
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-96 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Lỗi khi tải dữ liệu bảng lương: ${error}
          </AlertDescription>
        </Alert>
        <Button onClick={fetchPayrollData}>Thử lại</Button>
      </div>
    )
  }

  // Show empty state
  if (payrollHistory.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hồ sơ bảng lương của tôi</h1>
            <p className="text-muted-foreground">Xem chi tiết lương, phụ cấp, bảo hiểm và thuế</p>
          </div>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Chưa có dữ liệu bảng lương nào. Vui lòng liên hệ HR để biết thêm thông tin.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get current payroll from filtered data (first record of selected year)
  const currentPayroll = filteredPayrollHistory[0] || payrollHistory[0]
  const selectedPayroll = selectedMonth || currentPayroll
  
  // Guard clause - should not happen but for TypeScript
  if (!selectedPayroll) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Không có dữ liệu bảng lương để hiển thị.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  const yearToDateEarnings = filteredPayrollHistory
    .reduce((sum, p) => sum + p.netSalary, 0)

  const totalAllowances = selectedPayroll ? Object.values(selectedPayroll.allowances).reduce((sum, val) => sum + val, 0) : 0
  const totalEmployeeInsurance = selectedPayroll ? Object.values(selectedPayroll.employeeInsurance).reduce((sum, val) => sum + val, 0) : 0
  const totalCompanyInsurance = selectedPayroll ? Object.values(selectedPayroll.companyInsurance).reduce((sum, val) => sum + val, 0) : 0

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hồ sơ bảng lương của tôi</h1>
          <p className="text-muted-foreground">Xem chi tiết lương, phụ cấp, bảo hiểm và thuế</p>
        </div>
        <Button 
          onClick={() => selectedPayroll && handleDownloadPayroll(selectedPayroll)}
          disabled={!selectedPayroll || isDownloading === selectedPayroll?.id.toString()}
        >
          {isDownloading === selectedPayroll?.id.toString() ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
              Đang tải...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Tải phiếu lương
            </>
          )}
        </Button>
      </div>

      {/* Current Month Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tháng hiện tại</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPayroll.month}</div>
            <p className="text-xs text-muted-foreground">
              Trả lương: {new Date(currentPayroll.payDate).toLocaleDateString("vi-VN")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentPayroll.taxCalculation.grossIncome)}</div>
            <p className="text-xs text-muted-foreground">Trước khấu trừ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thực lĩnh</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(currentPayroll.netSalary)}</div>
            <p className="text-xs text-muted-foreground">Sau khấu trừ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thu nhập năm</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearToDateEarnings)}</div>
            <p className="text-xs text-muted-foreground">Tích lũy {selectedYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn tháng xem chi tiết</CardTitle>
          <CardDescription>Chọn tháng để xem thông tin lương chi tiết</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select 
              value={selectedYear} 
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length > 0 ? (
                  availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="2024">2024</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select
              value={selectedPayroll?.month}
              onValueChange={(value) => {
                const month = filteredPayrollHistory.find((p) => p.month === value)
                if (month) setSelectedMonth(month)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {filteredPayrollHistory.length > 0 ? (
                  filteredPayrollHistory.map((record) => (
                    <SelectItem key={record.id} value={record.month}>
                      {record.month}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    Không có dữ liệu năm {selectedYear}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Income Details */}
        <div className="space-y-6">
          {/* Basic Salary & Attendance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                Lương cơ bản & Chấm công
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Lương cơ bản tháng</div>
                  <div className="text-lg font-semibold">{formatCurrency(selectedPayroll.basicSalary)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Chấm công</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedPayroll.attendanceRate === 100 ? "default" : "secondary"}>
                      {selectedPayroll.presentDays}/{selectedPayroll.workingDays} ngày
                    </Badge>
                    <span className="text-sm font-medium">({selectedPayroll.attendanceRate}%)</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium">Lương cơ bản thực tế:</span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatCurrency(selectedPayroll.actualBasicSalary)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Allowances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                Các khoản phụ cấp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp nhà ở</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.housing)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp đi lại</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.transport)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp điện thoại</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.phone)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp ăn uống</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.meal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp chuyên cần</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.attendance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp chức vụ</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.position)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Phụ cấp khác</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.allowances.other)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-green-600">
                <span>Tổng phụ cấp:</span>
                <span>{formatCurrency(totalAllowances)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Overtime */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-purple-600" />
                </div>
                Làm thêm giờ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">

              {/* Display both weekday and weekend overtime if data exists */}
              {(selectedPayroll.weekdayOvertimeHours! > 0 || selectedPayroll.weekendOvertimeHours! > 0) ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Làm thêm ngày thường ({salaryRegulations?.overtimeWeekdayRate ?? 150}%)</span>
                      <span className="font-medium">
                        {(selectedPayroll.weekdayOvertimeHours! / 8).toFixed(1)} công
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Làm thêm cuối tuần ({salaryRegulations?.overtimeWeekendRate ?? 200}%)</span>
                      <span className="font-medium">
                        {(selectedPayroll.weekendOvertimeHours! / 8).toFixed(1)} công
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Tiền làm thêm ngày thường:</span>
                      <span>{formatCurrency(selectedPayroll.weekdayOvertimePay || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tiền làm thêm cuối tuần:</span>
                      <span>{formatCurrency(selectedPayroll.weekendOvertimePay || 0)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-purple-600">
                    <span>Tổng tiền làm thêm:</span>
                    <span>{formatCurrency(selectedPayroll.overtimePay)}</span>
                  </div>
                </>
              ) : (
                // Fallback to original display if no detailed data
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Số công làm thêm</div>
                      <div className="text-lg font-semibold">{(selectedPayroll.overtimeHours / 8).toFixed(1)} công</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Hệ số</div>
                      <div className="text-lg font-semibold">
                        {salaryRegulations?.overtimeWeekdayRate ?? selectedPayroll.overtimeRate}%
                      </div>

                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-purple-600">
                    <span>Tiền làm thêm:</span>
                    <span>{formatCurrency(selectedPayroll.overtimePay)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Deductions */}
        <div className="space-y-6">
          {/* Employee Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-red-600" />
                </div>
                Bảo hiểm nhân viên đóng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-500 mb-2">
                Mức lương đóng BH: {formatCurrency(selectedPayroll.insuranceBase)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">BHXH (8%)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(selectedPayroll.employeeInsurance.social)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">BHYT (1.5%)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(selectedPayroll.employeeInsurance.health)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">BHTN (1%)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(selectedPayroll.employeeInsurance.unemployment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Kinh phí CĐ (0%)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(selectedPayroll.employeeInsurance.union)}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-red-600">
                <span>Tổng BH nhân viên:</span>
                <span>{formatCurrency(totalEmployeeInsurance)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tax Calculation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-orange-600" />
                </div>
                Tính thuế thu nhập cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Tổng thu nhập</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.taxCalculation.grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Trừ: Bảo hiểm NV</span>
                  <span className="font-medium text-red-600">-{formatCurrency(totalEmployeeInsurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Thu nhập sau BH</span>
                  <span className="font-medium">
                    {formatCurrency(selectedPayroll.taxCalculation.incomeAfterInsurance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">- Phụ cấp ăn trưa:</span>
                  <span className="font-medium text-xs">
                    {formatCurrency(selectedPayroll.taxCalculation.actualMealAllowance)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Thu nhập tính thuế:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedPayroll.taxCalculation.incomeForTax)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm">Giảm trừ bản thân</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedPayroll.taxCalculation.personalDeduction)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Giảm trừ người phụ thuộc ({selectedPayroll.dependents} người)</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedPayroll.taxCalculation.dependentDeduction)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm">Thu nhập chịu thuế</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.taxCalculation.taxableIncome)}</span>
                </div>
                <div className="flex justify-between font-semibold text-orange-600">
                  <span>Thuế TNCN:</span>
                  <span>{formatCurrency(selectedPayroll.taxCalculation.incomeTax)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Insurance (Info only) */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                Bảo hiểm công ty đóng (tham khảo)
              </CardTitle>
              <CardDescription>Các khoản công ty đóng thay nhân viên</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>BHXH công ty (17.5%)</span>
                <span className="font-medium">{formatCurrency(selectedPayroll.companyInsurance.social)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>BHYT công ty (3%)</span>
                <span className="font-medium">{formatCurrency(selectedPayroll.companyInsurance.health)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>BHTN công ty (1%)</span>
                <span className="font-medium">{formatCurrency(selectedPayroll.companyInsurance.unemployment)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-blue-600">
                <span>Tổng BH công ty:</span>
                <span>{formatCurrency(totalCompanyInsurance)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-center text-green-700">Tổng kết lương tháng {selectedPayroll.month}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 text-center">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Tổng thu nhập</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(selectedPayroll.taxCalculation.grossIncome)}
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Tổng khấu trừ</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(selectedPayroll.totalDeductions)}</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Chi phí công ty</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(totalCompanyInsurance)}</div>
            </div>
            <div className="p-4 bg-green-100 rounded-lg shadow-sm border-2 border-green-300">
              <div className="text-sm text-green-600 font-medium">Lương thực lĩnh</div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(selectedPayroll.netSalary)}</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Mã số thuế: {selectedPayroll.taxCode}</div>
              <div>• Số người phụ thuộc: {selectedPayroll.dependents} người</div>
              <div>• Ngày trả lương: {new Date(selectedPayroll.payDate).toLocaleDateString("vi-VN")}</div>
              <div>
                • Trạng thái: <Badge variant="default">{selectedPayroll.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử bảng lương</CardTitle>
          <CardDescription>Lịch sử chi tiết các tháng đã được trả lương</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tháng</TableHead>
                  <TableHead className="text-right">Lương cơ bản</TableHead>
                  <TableHead className="text-right">Phụ cấp</TableHead>
                  <TableHead className="text-right">Làm thêm</TableHead>
                  <TableHead className="text-right">Tổng thu nhập</TableHead>
                  <TableHead className="text-right">Khấu trừ</TableHead>
                  <TableHead className="text-right">Thực lĩnh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrollHistory.map((record) => {
                    const totalAllowances = Object.values(record.allowances).reduce((sum, val) => sum + val, 0)
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.actualBasicSalary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalAllowances)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.overtimePay)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(record.taxCalculation.grossIncome)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(record.totalDeductions)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(record.netSalary)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{record.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewDetail(record)}
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDownloadPayroll(record)}
                              disabled={isDownloading === record.id.toString()}
                              title="Tải phiếu lương"
                            >
                              {isDownloading === record.id.toString() ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!viewDetailRecord} onOpenChange={() => setViewDetailRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Chi tiết bảng lương {viewDetailRecord?.month}
            </DialogTitle>
          </DialogHeader>
          
          {viewDetailRecord && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Lương cơ bản:</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Số ngày làm việc:</span>
                      <span className="font-medium">{viewDetailRecord.workingDays} ngày</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Số ngày có mặt:</span>
                      <span className="font-medium">{viewDetailRecord.presentDays} ngày</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tỷ lệ chấm công:</span>
                      <Badge variant={viewDetailRecord.attendanceRate === 100 ? "default" : "secondary"}>
                        {viewDetailRecord.attendanceRate}%
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Lương cơ bản thực tế:</span>
                      <span className="text-blue-600">{formatCurrency(viewDetailRecord.actualBasicSalary)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Làm thêm giờ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Số công làm thêm:</span>
                      <span className="font-medium">{(viewDetailRecord.overtimeHours / 8).toFixed(1)} công</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tỷ lệ:</span>
                      <span className="font-medium">{viewDetailRecord.overtimeRate}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Tiền làm thêm:</span>
                      <span className="text-green-600">{formatCurrency(viewDetailRecord.overtimePay)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Allowances */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Các khoản phụ cấp</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Phụ cấp nhà ở:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.housing)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phụ cấp đi lại:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.transport)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phụ cấp điện thoại:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.phone)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phụ cấp ăn uống:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.meal)}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Phụ cấp chuyên cần:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.attendance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phụ cấp chức vụ:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.position)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phụ cấp khác:</span>
                        <span className="font-medium">{formatCurrency(viewDetailRecord.allowances.other)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Tổng phụ cấp:</span>
                        <span className="text-green-600">
                          {formatCurrency(Object.values(viewDetailRecord.allowances).reduce((sum, val) => sum + val, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insurance & Tax */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bảo hiểm nhân viên đóng</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600 mb-2">
                      Mức lương đóng BH: {formatCurrency(viewDetailRecord.insuranceBase)}
                    </div>
                    <div className="flex justify-between">
                      <span>BHXH (8%):</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.employeeInsurance.social)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BHYT (1.5%):</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.employeeInsurance.health)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BHTN (1%):</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.employeeInsurance.unemployment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kinh phí CĐ (0%):</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.employeeInsurance.union)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Tổng BH nhân viên:</span>
                      <span className="text-red-600">
                        {formatCurrency(Object.values(viewDetailRecord.employeeInsurance).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Thuế thu nhập cá nhân</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Tổng thu nhập:</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.taxCalculation.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trừ: Bảo hiểm NV:</span>
                      <span className="font-medium">
                        -{formatCurrency(viewDetailRecord.taxCalculation.grossIncome - viewDetailRecord.taxCalculation.incomeAfterInsurance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thu nhập sau BH:</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.taxCalculation.incomeAfterInsurance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs">- Phụ cấp ăn trưa:</span>
                      <span className="font-medium text-xs">{formatCurrency(viewDetailRecord.taxCalculation.actualMealAllowance)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Thu nhập tính thuế:</span>
                      <span className="font-bold">{formatCurrency(viewDetailRecord.taxCalculation.incomeForTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giảm trừ bản thân:</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.taxCalculation.personalDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Giảm trừ người phụ thuộc ({viewDetailRecord.dependents} người):</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.taxCalculation.dependentDeduction)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Thu nhập tính thuế:</span>
                      <span className="font-medium">{formatCurrency(viewDetailRecord.taxCalculation.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Thuế TNCN:</span>
                      <span className="text-red-600">{formatCurrency(viewDetailRecord.taxCalculation.incomeTax)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-center text-green-700">Tổng kết lương tháng {viewDetailRecord.month}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold mb-3">Thu nhập:</h4>
                      <div className="flex justify-between">
                        <span>Tổng thu nhập:</span>
                        <span className="font-bold">{formatCurrency(viewDetailRecord.taxCalculation.grossIncome)}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Khấu trừ:</h4>
                      <div className="flex justify-between">
                        <span>Tổng khấu trừ:</span>
                        <div className="text-xl font-bold text-red-600">{formatCurrency(viewDetailRecord.totalDeductions)}</div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Thực lĩnh</h3>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(viewDetailRecord.netSalary)}</div>
                  </div>
                  
                  <div className="pt-4 border-t text-sm text-gray-600 space-y-1">
                    <div>• Mã số thuế: {viewDetailRecord.taxCode}</div>
                    <div>• Số người phụ thuộc: {viewDetailRecord.dependents} người</div>
                    <div>• Ngày trả lương: {new Date(viewDetailRecord.payDate).toLocaleDateString("vi-VN")}</div>
                    <div>
                      • Trạng thái: <Badge variant="default">{viewDetailRecord.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadPayroll(viewDetailRecord)}
                  disabled={isDownloading === viewDetailRecord.id.toString()}
                >
                  {isDownloading === viewDetailRecord.id.toString() ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Tải phiếu lương
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.print()}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  In
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
