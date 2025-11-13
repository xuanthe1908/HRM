"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Wallet, 
  Search, 
  Plus, 
  Minus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  RefreshCw,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { EmployeeBalanceService, EmployeeBalance } from "@/lib/employee-balance-service"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface BalanceStatistics {
  totalEmployees: number
  positiveBalance: number
  negativeBalance: number
  zeroBalance: number
  totalPositiveAmount: number
  totalNegativeAmount: number
}

export default function EmployeeBalancesPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [balances, setBalances] = useState<EmployeeBalance[]>([])
  const [filteredBalances, setFilteredBalances] = useState<EmployeeBalance[]>([])
  const [statistics, setStatistics] = useState<BalanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Dialog states
  const [adjustmentDialog, setAdjustmentDialog] = useState(false)
  const [settlementDialog, setSettlementDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeBalance | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentDescription, setAdjustmentDescription] = useState("")
  const [adjustmentNotes, setAdjustmentNotes] = useState("")
  const [settlementAmount, setSettlementAmount] = useState("")
  const [settlementNotes, setSettlementNotes] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterBalances()
  }, [balances, searchTerm, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [balancesData, statsData] = await Promise.all([
        EmployeeBalanceService.getAllEmployeeBalances(),
        EmployeeBalanceService.getBalanceStatistics()
      ])
      
      setBalances(balancesData)
      setStatistics(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu số dư nhân viên",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterBalances = () => {
    let filtered = balances

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(balance =>
        balance.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        balance.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        balance.department_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(balance => {
        if (statusFilter === "positive") return balance.current_balance > 0
        if (statusFilter === "negative") return balance.current_balance < 0
        if (statusFilter === "zero") return balance.current_balance === 0
        return true
      })
    }

    setFilteredBalances(filtered)
  }

  const handleAdjustment = async () => {
    if (!selectedEmployee || !adjustmentAmount || !adjustmentDescription) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessing(true)
      await EmployeeBalanceService.adjustBalance({
        employeeId: selectedEmployee.employee_id,
        amount: parseFloat(adjustmentAmount),
        description: adjustmentDescription,
        notes: adjustmentNotes
      })

      toast({
        title: "Thành công",
        description: "Điều chỉnh số dư thành công"
      })

      // Reset form
      setAdjustmentAmount("")
      setAdjustmentDescription("")
      setAdjustmentNotes("")
      setAdjustmentDialog(false)
      setSelectedEmployee(null)

      // Reload data
      await loadData()
    } catch (error) {
      console.error('Error adjusting balance:', error)
      toast({
        title: "Lỗi",
        description: "Không thể điều chỉnh số dư",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleSettlement = async () => {
    if (!selectedEmployee || !settlementAmount) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền thanh toán",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessing(true)
      await EmployeeBalanceService.monthlySettlement(
        selectedEmployee.employee_id,
        parseFloat(settlementAmount),
        settlementNotes
      )

      toast({
        title: "Thành công",
        description: "Thanh toán cuối tháng thành công"
      })

      // Reset form
      setSettlementAmount("")
      setSettlementNotes("")
      setSettlementDialog(false)
      setSelectedEmployee(null)

      // Reload data
      await loadData()
    } catch (error) {
      console.error('Error processing settlement:', error)
      toast({
        title: "Lỗi",
        description: "Không thể xử lý thanh toán",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const getBalanceStatusColor = (balance: number) => {
    if (balance > 0) return "bg-green-100 text-green-800"
    if (balance < 0) return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  const getBalanceStatusIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-4 w-4" />
    if (balance < 0) return <TrendingDown className="h-4 w-4" />
    return <DollarSign className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard allowedDbRoles={["admin","accountant"]} redirectTo="/forbidden">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý số dư nhân viên</h1>
          <p className="text-muted-foreground">
            Theo dõi và quản lý số dư ứng trước của nhân viên
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalEmployees}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số dư dương</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.positiveBalance}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(statistics.totalPositiveAmount)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số dư âm</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.negativeBalance}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(statistics.totalNegativeAmount)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số dư bằng 0</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{statistics.zeroBalance}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Tìm theo tên, mã nhân viên, phòng ban..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <Label htmlFor="status">Trạng thái số dư</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="positive">Số dư dương</SelectItem>
                  <SelectItem value="negative">Số dư âm</SelectItem>
                  <SelectItem value="zero">Số dư bằng 0</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách số dư nhân viên</CardTitle>
          <CardDescription>
            {filteredBalances.length} nhân viên được tìm thấy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  <TableHead className="text-right">Số dư hiện tại</TableHead>
                  <TableHead className="text-right">Tổng nhận</TableHead>
                  <TableHead className="text-right">Tổng chi</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((balance) => (
                  <TableRow key={balance.employee_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{balance.employee_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {balance.employee_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{balance.department_name || "-"}</TableCell>
                    <TableCell>{balance.position_name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Badge className={getBalanceStatusColor(balance.current_balance)}>
                          {getBalanceStatusIcon(balance.current_balance)}
                        </Badge>
                        <span className="font-medium">
                          {formatCurrency(balance.current_balance)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balance.total_received)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balance.total_spent)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEmployee(balance)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Điều chỉnh
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Điều chỉnh số dư</DialogTitle>
                              <DialogDescription>
                                Điều chỉnh số dư cho {balance.employee_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="amount">Số tiền</Label>
                                <Input
                                  id="amount"
                                  type="number"
                                  placeholder="Nhập số tiền (dương để cộng, âm để trừ)"
                                  value={adjustmentAmount}
                                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">Mô tả</Label>
                                <Input
                                  id="description"
                                  placeholder="Lý do điều chỉnh"
                                  value={adjustmentDescription}
                                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="notes">Ghi chú</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Ghi chú bổ sung"
                                  value={adjustmentNotes}
                                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setAdjustmentAmount("")
                                  setAdjustmentDescription("")
                                  setAdjustmentNotes("")
                                }}
                              >
                                Hủy
                              </Button>
                              <Button onClick={handleAdjustment} disabled={processing}>
                                {processing ? "Đang xử lý..." : "Điều chỉnh"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEmployee(balance)}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Thanh toán
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Thanh toán cuối tháng</DialogTitle>
                              <DialogDescription>
                                Thanh toán cho {balance.employee_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="settlement-amount">Số tiền thanh toán</Label>
                                <div className="flex space-x-2">
                                  <Input
                                    id="settlement-amount"
                                    type="number"
                                    placeholder="Nhập số tiền thanh toán"
                                    value={settlementAmount}
                                    onChange={(e) => setSettlementAmount(e.target.value)}
                                  />
                                  {balance.current_balance < 0 && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        const amountToPay = Math.abs(balance.current_balance)
                                        setSettlementAmount(amountToPay.toString())
                                      }}
                                    >
                                      Thanh toán toàn bộ nợ
                                    </Button>
                                  )}
                                  {balance.current_balance > 0 && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setSettlementAmount((-balance.current_balance).toString())
                                      }}
                                    >
                                      Rút toàn bộ số dư
                                    </Button>
                                  )}
                                </div>
                                {balance.current_balance < 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Số dư hiện tại: {formatCurrency(balance.current_balance)} 
                                    (Cần thanh toán: {formatCurrency(Math.abs(balance.current_balance))})
                                  </p>
                                )}
                                {balance.current_balance > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Số dư hiện tại: {formatCurrency(balance.current_balance)} 
                                    (Có thể rút: {formatCurrency(balance.current_balance)})
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="settlement-notes">Ghi chú</Label>
                                <Textarea
                                  id="settlement-notes"
                                  placeholder="Ghi chú thanh toán"
                                  value={settlementNotes}
                                  onChange={(e) => setSettlementNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSettlementAmount("")
                                  setSettlementNotes("")
                                }}
                              >
                                Hủy
                              </Button>
                              <Button onClick={handleSettlement} disabled={processing}>
                                {processing ? "Đang xử lý..." : "Thanh toán"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
}
