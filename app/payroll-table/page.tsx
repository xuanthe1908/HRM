"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

// Sample payroll data
const payrollData = [
  {
    stt: 1,
    employeeCode: "NV001",
    employeeName: "Nguyễn Văn An",
    position: "Senior Developer",
    basicSalary: 25000000,
    dailyRate: 1136364,
    fullPayDays: 22,
    fullPayAmount: 25000000,
    reducedDays: 0,
    proratedDays: 0,
    reducedAmount: 0,
    otDays: 8,
    otPay: 1200000,
    fundedAllowance: 4000000,
    lunchAllowance: 1500000,
    transportAllowance: 1000000,
    phoneAllowance: 300000,
    attendanceBonus: 500000,
    otherAllowance: 200000,
    grossIncome: 33700000,
    advancePayment: 5000000,
    insuranceBaseSalary: 25000000,
    socialInsuranceEmp: 2000000,
    healthInsuranceEmp: 375000,
    unemploymentInsuranceEmp: 250000,
    unionFeeEmp: 25000,
    incomeTax: 2850000,
    totalDeduction: 10500000,
    familyDeduction: 11000000,
    taxableIncome: 22700000,
    taxableSalary: 11700000,
    bonus: 0,
    netPay: 23200000,
    socialInsuranceCom: 4300000,
    healthInsuranceCom: 750000,
    unemploymentInsuranceCom: 250000,
    unionFeeCom: 25000,
  },
  {
    stt: 2,
    employeeCode: "NV002",
    employeeName: "Trần Thị Bình",
    position: "Marketing Manager",
    basicSalary: 20000000,
    dailyRate: 909091,
    fullPayDays: 22,
    fullPayAmount: 20000000,
    reducedDays: 0,
    proratedDays: 0,
    reducedAmount: 0,
    otDays: 5,
    otPay: 600000,
    fundedAllowance: 3500000,
    lunchAllowance: 1500000,
    transportAllowance: 800000,
    phoneAllowance: 300000,
    attendanceBonus: 500000,
    otherAllowance: 0,
    grossIncome: 27200000,
    advancePayment: 3000000,
    insuranceBaseSalary: 20000000,
    socialInsuranceEmp: 1600000,
    healthInsuranceEmp: 300000,
    unemploymentInsuranceEmp: 200000,
    unionFeeEmp: 20000,
    incomeTax: 2100000,
    totalDeduction: 7220000,
    familyDeduction: 11000000,
    taxableIncome: 16200000,
    taxableSalary: 5200000,
    bonus: 1000000,
    netPay: 21980000,
    socialInsuranceCom: 3440000,
    healthInsuranceCom: 600000,
    unemploymentInsuranceCom: 200000,
    unionFeeCom: 20000,
  },
  {
    stt: 3,
    employeeCode: "NV003",
    employeeName: "Lê Văn Cường",
    position: "Sales Representative",
    basicSalary: 18000000,
    dailyRate: 818182,
    fullPayDays: 21,
    fullPayAmount: 17181818,
    reducedDays: 1,
    proratedDays: 1,
    reducedAmount: 818182,
    otDays: 12,
    otPay: 1440000,
    fundedAllowance: 3000000,
    lunchAllowance: 1500000,
    transportAllowance: 600000,
    phoneAllowance: 200000,
    attendanceBonus: 0,
    otherAllowance: 500000,
    grossIncome: 23503636,
    advancePayment: 2500000,
    insuranceBaseSalary: 18000000,
    socialInsuranceEmp: 1440000,
    healthInsuranceEmp: 270000,
    unemploymentInsuranceEmp: 180000,
    unionFeeEmp: 18000,
    incomeTax: 1650000,
    totalDeduction: 6058000,
    familyDeduction: 11000000,
    taxableIncome: 12503636,
    taxableSalary: 1503636,
    bonus: 2000000,
    netPay: 19945636,
    socialInsuranceCom: 3096000,
    healthInsuranceCom: 540000,
    unemploymentInsuranceCom: 180000,
    unionFeeCom: 18000,
  },
]

export default function PayrollTablePage() {
  const { formatCurrency } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("Tháng 6/2024")
  const [selectedEmployee, setSelectedEmployee] = useState("all")

  const filteredData = payrollData.filter((employee) => {
    const matchesSearch =
      employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEmployee = selectedEmployee === "all" || employee.employeeCode === selectedEmployee
    return matchesSearch && matchesEmployee
  })

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bảng Lương Chi Tiết</h1>
          <p className="text-muted-foreground">Quản lý thông tin lương chi tiết của nhân viên</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Download className="mr-2 h-4 w-4" />
          Tải Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>Lọc dữ liệu theo nhân viên, tháng và năm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn nhân viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhân viên</SelectItem>
                {payrollData.map((emp) => (
                  <SelectItem key={emp.employeeCode} value={emp.employeeCode}>
                    {emp.employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tháng 6/2024">Tháng 6/2024</SelectItem>
                <SelectItem value="Tháng 5/2024">Tháng 5/2024</SelectItem>
                <SelectItem value="Tháng 4/2024">Tháng 4/2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bảng Lương {selectedMonth}</CardTitle>
          <CardDescription>Hiển thị {filteredData.length} nhân viên</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[3000px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead rowSpan={2} className="text-center border-r font-semibold min-w-[60px]">
                    STT
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border-r font-semibold min-w-[100px]">
                    Mã NV
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border-r font-semibold min-w-[150px]">
                    Tên nhân viên
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border-r font-semibold min-w-[120px]">
                    Chức danh
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border-r font-semibold min-w-[120px]">
                    Lương cơ bản
                  </TableHead>

                  {/* Attendance & Salary */}
                  <TableHead colSpan={3} className="text-center border-r font-semibold bg-blue-50">
                    Chấm công & Lương
                  </TableHead>

                  {/* Deducted Work Days */}
                  <TableHead colSpan={3} className="text-center border-r font-semibold bg-red-50">
                    Ngày công giảm
                  </TableHead>

                  {/* Overtime */}
                  <TableHead colSpan={2} className="text-center border-r font-semibold bg-green-50">
                    Làm thêm
                  </TableHead>

                  {/* Allowances */}
                  <TableHead colSpan={6} className="text-center border-r font-semibold bg-yellow-50">
                    Phụ cấp
                  </TableHead>

                  {/* Income & Advance */}
                  <TableHead colSpan={3} className="text-center border-r font-semibold bg-purple-50">
                    Thu nhập & Tạm ứng
                  </TableHead>

                  {/* Employee Insurance */}
                  <TableHead colSpan={4} className="text-center border-r font-semibold bg-orange-50">
                    Bảo hiểm NV
                  </TableHead>

                  {/* Tax & Deduction */}
                  <TableHead colSpan={7} className="text-center border-r font-semibold bg-pink-50">
                    Thuế & Khấu trừ
                  </TableHead>

                  {/* Company Insurance */}
                  <TableHead colSpan={4} className="text-center font-semibold bg-indigo-50">
                    Bảo hiểm CTY
                  </TableHead>
                </TableRow>
                <TableRow className="bg-muted/30">
                  {/* Attendance & Salary */}
                  <TableHead className="text-center border-r text-xs min-w-[100px]">Đơn giá ngày</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[80px]">Ngày 100%</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px]">Tiền 100%</TableHead>

                  {/* Deducted Work Days */}
                  <TableHead className="text-center border-r text-xs min-w-[80px]">Ngày giảm</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[80px]">Công tỷ lệ</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">Tiền giảm</TableHead>

                  {/* Overtime */}
                  <TableHead className="text-center border-r text-xs min-w-[80px]">Công OT</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">Tiền OT</TableHead>

                  {/* Allowances */}
                  <TableHead className="text-center border-r text-xs min-w-[100px]">PC quỹ lương</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">PC ăn trưa</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">PC xăng xe</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">PC điện thoại</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">TC chuyên cần</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">PC khác</TableHead>

                  {/* Income & Advance */}
                  <TableHead className="text-center border-r text-xs min-w-[120px]">Tổng số</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">Tạm ứng</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px]">Lương đóng BH</TableHead>

                  {/* Employee Insurance */}
                  <TableHead className="text-center border-r text-xs min-w-[100px]">BHXH NV</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">BHYT NV</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">BHTN NV</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">KPCĐ NV</TableHead>

                  {/* Tax & Deduction */}
                  <TableHead className="text-center border-r text-xs min-w-[100px]">Thuế TNCN</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px]">Tổng khấu trừ</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px]">Giảm trừ GC</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px]">TN chịu thuế</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px]">TN tính thuế</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">Thưởng</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[120px] bg-green-100 font-semibold">
                    Thực lĩnh
                  </TableHead>

                  {/* Company Insurance */}
                  <TableHead className="text-center border-r text-xs min-w-[100px]">BHXH CTY</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">BHYT CTY</TableHead>
                  <TableHead className="text-center border-r text-xs min-w-[100px]">BHTN CTY</TableHead>
                  <TableHead className="text-center text-xs min-w-[100px]">KPCĐ CTY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((employee) => (
                  <TableRow key={employee.employeeCode} className="hover:bg-muted/50">
                    <TableCell className="text-center border-r font-medium">{employee.stt}</TableCell>
                    <TableCell className="text-center border-r font-medium">{employee.employeeCode}</TableCell>
                    <TableCell className="border-r font-medium">{employee.employeeName}</TableCell>
                    <TableCell className="border-r text-sm">{employee.position}</TableCell>
                    <TableCell className="text-right border-r font-medium">
                      {formatCurrency(employee.basicSalary)}
                    </TableCell>

                    {/* Attendance & Salary */}
                    <TableCell className="text-right border-r">{formatCurrency(employee.dailyRate)}</TableCell>
                    <TableCell className="text-center border-r">{employee.fullPayDays}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.fullPayAmount)}</TableCell>

                    {/* Deducted Work Days */}
                    <TableCell className="text-center border-r">{employee.reducedDays}</TableCell>
                    <TableCell className="text-center border-r">{employee.proratedDays}</TableCell>
                    <TableCell className="text-right border-r text-red-600">
                      {employee.reducedAmount > 0 ? `-${formatCurrency(employee.reducedAmount)}` : "-"}
                    </TableCell>

                    {/* Overtime */}
                    <TableCell className="text-center border-r">{employee.otDays}</TableCell>
                    <TableCell className="text-right border-r text-green-600">
                      {formatCurrency(employee.otPay)}
                    </TableCell>

                    {/* Allowances */}
                    <TableCell className="text-right border-r">{formatCurrency(employee.fundedAllowance)}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.lunchAllowance)}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.transportAllowance)}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.phoneAllowance)}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.attendanceBonus)}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.otherAllowance)}</TableCell>

                    {/* Income & Advance */}
                    <TableCell className="text-right border-r font-semibold">
                      {formatCurrency(employee.grossIncome)}
                    </TableCell>
                    <TableCell className="text-right border-r text-orange-600">
                      {formatCurrency(employee.advancePayment)}
                    </TableCell>
                    <TableCell className="text-right border-r">
                      {formatCurrency(employee.insuranceBaseSalary)}
                    </TableCell>

                    {/* Employee Insurance */}
                    <TableCell className="text-right border-r text-red-600">
                      {formatCurrency(employee.socialInsuranceEmp)}
                    </TableCell>
                    <TableCell className="text-right border-r text-red-600">
                      {formatCurrency(employee.healthInsuranceEmp)}
                    </TableCell>
                    <TableCell className="text-right border-r text-red-600">
                      {formatCurrency(employee.unemploymentInsuranceEmp)}
                    </TableCell>
                    <TableCell className="text-right border-r text-red-600">
                      {formatCurrency(employee.unionFeeEmp)}
                    </TableCell>

                    {/* Tax & Deduction */}
                    <TableCell className="text-right border-r text-red-600">
                      {formatCurrency(employee.incomeTax)}
                    </TableCell>
                    <TableCell className="text-right border-r text-red-600 font-semibold">
                      {formatCurrency(employee.totalDeduction)}
                    </TableCell>
                    <TableCell className="text-right border-r text-green-600">
                      {formatCurrency(employee.familyDeduction)}
                    </TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.taxableIncome)}</TableCell>
                    <TableCell className="text-right border-r">{formatCurrency(employee.taxableSalary)}</TableCell>
                    <TableCell className="text-right border-r text-green-600">
                      {formatCurrency(employee.bonus)}
                    </TableCell>
                    <TableCell className="text-right border-r font-bold text-green-700 bg-green-50">
                      {formatCurrency(employee.netPay)}
                    </TableCell>

                    {/* Company Insurance */}
                    <TableCell className="text-right border-r text-blue-600">
                      {formatCurrency(employee.socialInsuranceCom)}
                    </TableCell>
                    <TableCell className="text-right border-r text-blue-600">
                      {formatCurrency(employee.healthInsuranceCom)}
                    </TableCell>
                    <TableCell className="text-right border-r text-blue-600">
                      {formatCurrency(employee.unemploymentInsuranceCom)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(employee.unionFeeCom)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary Row */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tổng lương cơ bản: </span>
                <span className="font-semibold">
                  {formatCurrency(filteredData.reduce((sum, emp) => sum + emp.basicSalary, 0))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tổng thu nhập: </span>
                <span className="font-semibold">
                  {formatCurrency(filteredData.reduce((sum, emp) => sum + emp.grossIncome, 0))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tổng khấu trừ: </span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(filteredData.reduce((sum, emp) => sum + emp.totalDeduction, 0))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tổng thực lĩnh: </span>
                <span className="font-bold text-green-600">
                  {formatCurrency(filteredData.reduce((sum, emp) => sum + emp.netPay, 0))}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
