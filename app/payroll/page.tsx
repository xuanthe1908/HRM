"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, FileText, DollarSign, TrendingUp, Eye, Download, Shield, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"
import { payrollService, employeeService, departmentService, positionService } from "@/lib/services"
import type { Payroll, Employee, Department, Position } from "@/lib/services"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  paid: "default", // Thường là màu xanh lá hoặc màu chính
  approved: "secondary",
  pending: "outline",
  rejected: "destructive",
};

export default function PayrollPage() {
  const { t, formatCurrency } = useLanguage()
  const router = useRouter()
  
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

// Handle PDF export
const handleExportPDF = async () => {
  try {
    setIsExporting(true);

    const previewWin = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (previewWin) {
      previewWin.document.write("<!doctype html><title>Đang tạo PDF...</title><body style='font-family:system-ui;padding:16px'>Đang tạo file PDF, vui lòng đợi...</body>");
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

    const payrollIds =
      selectedRows.size > 0
        ? Array.from(selectedRows)
        : processedPayrolls.map(p => p.id);

    const res = await fetch("/api/payroll/export-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Accept": "application/pdf",
      },
      body: JSON.stringify({
        month: selectedMonth,
        year: selectedYear,
        payrollIds,
      }),
    });

    if (!res.ok) {
      let msg = "Xuất PDF thất bại.";
      try {
        const { error } = await res.json();
        if (error) msg = error;
      } catch (_) {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (previewWin) {
      const filename = `bang-luong-${selectedMonth || "all"}-${selectedYear}.pdf`;
      previewWin.document.open();
      previewWin.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Xem trước ${filename}</title>
            <style>
              html, body { margin:0; height:100%; }
              .toolbar {
                position: fixed; top: 8px; right: 8px; z-index: 10;
                background: rgba(255,255,255,0.9); border: 1px solid #e5e7eb; border-radius: 10px;
                padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); font-family: system-ui;
              }
              .btn {
                display:inline-block; padding:8px 12px; text-decoration:none; border:1px solid #d1d5db; border-radius:8px; color:#111827;
              }
              iframe { border:0; width:100%; height:100%; }
            </style>
          </head>
          <body>
            <iframe src="${url}" title="PDF preview"></iframe>
          </body>
        </html>
      `);
      previewWin.document.close();
    } else {
      window.open(url, "_blank");
    }
  } catch (err: any) {
    console.error("Export PDF error:", err);
    toast({
      title: "Lỗi",
      description: err?.message || "Không thể xuất PDF.",
      variant: "destructive",
    });
  } finally {
    setIsExporting(false);
  }
};


  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [payrollRes, empRes, deptRes, posRes] = await Promise.all([
                payrollService.getAll(),
                employeeService.getEmployees(),
                departmentService.getDepartments(),
                positionService.getPositions()
            ]);

            if(payrollRes.data) setPayrolls(payrollRes.data);
            if(empRes.data) setEmployees(empRes.data);
            if(deptRes.data) setDepartments(deptRes.data);
            if(posRes.data) setPositions(posRes.data);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Optionally set an error state to show in the UI
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const processedPayrolls = useMemo(() => {
    if (!Array.isArray(payrolls)) {
        return []; // Trả về mảng rỗng nếu payrolls không phải là mảng
    }
    return payrolls
      .filter(p => p.month === parseInt(selectedMonth) && p.year === parseInt(selectedYear))
      .map(p => {
        const employee = employees.find(e => e.id === p.employee_id)
        const department = departments.find(d => d.id === employee?.department_id)
        const position = positions.find(pos => pos.id === employee?.position_id)
        return {
          ...p,
          employee_name: employee?.name || 'N/A',
          employee_code: employee?.employee_code || 'N/A',
          department_name: department?.name || 'N/A',
          position_name: position?.name || 'N/A',
        }
      })
  }, [payrolls, employees, departments, positions, selectedMonth, selectedYear])

  const totalGross = processedPayrolls.reduce((sum, p) => sum + p.gross_income, 0)
  const totalDeductions = processedPayrolls.reduce((sum, p) => sum + p.total_deductions, 0)
  const totalNet = processedPayrolls.reduce((sum, p) => sum + p.net_salary, 0)
  const totalCompanyInsurance = processedPayrolls.reduce((sum, p) => sum + (p.social_insurance_company || 0) + (p.health_insurance_company || 0) + (p.unemployment_insurance_company || 0), 0)

  const viewPayrollDetail = (payroll: any) => {
    setSelectedPayroll(payroll)
    setIsDetailModalOpen(true)
  }

  const handleStatusChange = async (payrollId: string, newStatus: string) => {
    // Tìm và cập nhật trạng thái trong state ngay lập tức để UI phản hồi nhanh
    const originalPayrolls = [...payrolls];
    const updatedPayrolls = payrolls.map(p => 
        p.id === payrollId ? { ...p, status: newStatus as Payroll['status'] } : p
    );
    setPayrolls(updatedPayrolls);

    try {
      // Gọi API để cập nhật vào database
      await payrollService.update(payrollId, { status: newStatus });
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái bảng lương.",
      });
    } catch (error) {
      // Nếu có lỗi, khôi phục lại trạng thái ban đầu và thông báo
      setPayrolls(originalPayrolls);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái.",
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    const payrollIds = Array.from(selectedRows);
    if (payrollIds.length === 0) return;

    const originalPayrolls = [...payrolls];
    const updatedPayrolls = payrolls.map(p =>
      selectedRows.has(p.id) ? { ...p, status: newStatus as Payroll['status'] } : p
    );
    setPayrolls(updatedPayrolls);

    try {
      await payrollService.updateBatch(payrollIds, newStatus);
      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái cho ${payrollIds.length} bảng lương.`,
      });
      setSelectedRows(new Set()); // Clear selection
    } catch (error) {
      setPayrolls(originalPayrolls);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật hàng loạt.",
        variant: "destructive",
      });
    }
  };

  const toggleRowSelection = (payrollId: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(payrollId)) {
      newSelection.delete(payrollId);
    } else {
      newSelection.add(payrollId);
    }
    setSelectedRows(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === processedPayrolls.length) {
      setSelectedRows(new Set());
    } else {
      const allIds = new Set(processedPayrolls.map(p => p.id));
      setSelectedRows(allIds);
    }
  };


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
          <h1 className="text-3xl font-bold tracking-tight">Hồ sơ bảng lương</h1>
          <p className="text-muted-foreground">Tính toán lương hàng tháng và trạng thái thanh toán</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" /> 
            {isExporting ? "Đang xuất..." : "Xuất PDF"}
          </Button>
          <Button onClick={() => router.push("/calculate-payroll")}>
            <Calculator className="mr-2 h-4 w-4" /> Tính lương mới
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng lương Gốc</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalGross)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng Khấu trừ (NV)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng Thực Lĩnh</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Chi phí BH (CTY)</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCompanyInsurance)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ bảng lương chi tiết</CardTitle>
          <div className="flex items-center gap-4 pt-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => <SelectItem key={month} value={String(month)}>Tháng {month}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedRows.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Hành động ({selectedRows.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('pending')}>
                    Chuyển thành "Chờ xử lý"
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('approved')}>
                    Chuyển thành "Đã duyệt"
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('paid')}>
                    Chuyển thành "Đã thanh toán"
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500" onClick={() => handleBulkStatusChange('rejected')}>
                    Chuyển thành "Từ chối"
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedRows.size > 0 && selectedRows.size === processedPayrolls.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead className="text-right">Lương CB</TableHead>
                  <TableHead className="text-right">Phụ cấp</TableHead>
                  <TableHead className="text-right">Làm thêm</TableHead>
                  <TableHead className="text-right">Tổng Thu Nhập</TableHead>
                  <TableHead className="text-right">Khấu trừ</TableHead>
                  <TableHead className="text-right">Thực lĩnh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedPayrolls.length > 0 ? processedPayrolls.map((p) => (
                    <TableRow key={p.id} data-state={selectedRows.has(p.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(p.id)}
                          onCheckedChange={() => toggleRowSelection(p.id)}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{p.employee_name}</div>
                          <div className="text-sm text-muted-foreground">{p.employee_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{p.department_name}</div>
                          <div className="text-xs text-muted-foreground">{p.position_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(p.actual_base_salary || p.base_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.total_allowances)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.overtime_pay)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.gross_income)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(p.total_deductions)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatCurrency(p.net_salary)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start p-1 h-auto font-normal">
                                    <Badge variant={statusVariantMap[p.status] || 'outline'}>{p.status}</Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'pending')}>
                                    Chờ xử lý
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'approved')}>
                                    Đã duyệt
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'paid')}>
                                    Đã thanh toán
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'rejected')}>
                                    Từ chối
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => viewPayrollDetail(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                      </TableCell>
                    </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={10} className="text-center">Không có dữ liệu cho tháng/năm đã chọn.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl">
            {selectedPayroll && (
            <>
              <DialogHeader>
                    <DialogTitle>Phiếu lương chi tiết - {selectedPayroll.employee_name}</DialogTitle>
                    <DialogDescription>Tháng {selectedPayroll.month}/{selectedPayroll.year}</DialogDescription>
              </DialogHeader>
                <div className="py-4">
                    {/* TODO: Add detailed payroll breakdown here */}
                    <p>Chi tiết phiếu lương sẽ được hiển thị ở đây.</p>
                      </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
