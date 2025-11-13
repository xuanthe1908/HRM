"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, Coffee, AlertCircle, TrendingUp, Activity } from "lucide-react"
import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { apiClient } from "@/lib/api"

interface AttendanceRecord {
  id: string;
  month: string;
  year: number;
  monthNumber: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lateDays: number;
  absentDays: number;
  overtimeHours: number;
  attendanceRate: number;
  leaveType: string;
  records: any[];
}

export default function EmployeeAttendancePage() {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState("2025")
  const { t } = useLanguage()

  // Fetch attendance data
  useEffect(() => {
    fetchAttendanceData()
  }, [])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get('/employee/attendance')
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      const data = (response.data as AttendanceRecord[]) || []
      setAttendanceHistory(data)
      
      // Auto-set year to the most recent year in data
      if (data.length > 0) {
        setSelectedYear(data[0].year.toString())
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance data')
    } finally {
      setLoading(false)
    }
  }

  // Filter attendance by selected year
  const filteredAttendance = attendanceHistory.filter(record => 
    record.year.toString() === selectedYear
  )

  // Get available years from attendance data
  const availableYears = [...new Set(attendanceHistory.map(record => record.year.toString()))]
    .sort().reverse()

  // Calculate year-to-date statistics
  const yearToDateStats = filteredAttendance.reduce(
    (acc, record) => ({
      totalWorkingDays: acc.totalWorkingDays + record.workingDays,
      totalPresentDays: acc.totalPresentDays + record.presentDays,
      totalLeaveDays: acc.totalLeaveDays + record.leaveDays,
      totalLateDays: acc.totalLateDays + record.lateDays,
      totalAbsentDays: acc.totalAbsentDays + record.absentDays,
      totalOvertimeHours: acc.totalOvertimeHours + record.overtimeHours,
    }),
    { 
      totalWorkingDays: 0, 
      totalPresentDays: 0, 
      totalLeaveDays: 0, 
      totalLateDays: 0,
      totalAbsentDays: 0,
      totalOvertimeHours: 0 
    }
  )

  const ytdAttendanceRate = yearToDateStats.totalWorkingDays > 0 
    ? (yearToDateStats.totalPresentDays / yearToDateStats.totalWorkingDays) * 100 
    : 0

  const currentMonth = filteredAttendance[0] || {
    attendanceRate: 0,
    presentDays: 0,
    workingDays: 0,
    leaveDays: 0,
    leaveType: '-',
    overtimeHours: 0
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
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
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
            {t("attendance.loadError").replace("{error}", error)}
          </AlertDescription>
        </Alert>
        <button 
          onClick={fetchAttendanceData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("attendance.myTitle")}</h1>
          <p className="text-muted-foreground">{t("attendance.description")}</p>
        </div>
      </div>

      {/* Show empty state if no data */}
      {attendanceHistory.length === 0 ? (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            {t("attendance.noData")}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Current Month Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("attendance.thisMonth")}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMonth.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">{t("attendance.attendanceRate")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("attendance.daysPresent")}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMonth.presentDays}</div>
                <p className="text-xs text-muted-foreground">
                  Trên tổng {currentMonth.workingDays} ngày làm việc
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ngày nghỉ phép</CardTitle>
                <Coffee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMonth.leaveDays}</div>
                <p className="text-xs text-muted-foreground">{currentMonth.leaveType}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overtime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMonth.overtimeHours}h</div>
                <p className="text-xs text-muted-foreground">Làm thêm tháng này</p>
              </CardContent>
            </Card>
          </div>

          {/* Year to Date Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("attendance.yearToDate")}</CardTitle>
                  <CardDescription>
                    {t("attendance.yearlyStats").replace("{year}", selectedYear)}
                  </CardDescription>
                </div>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t("attendance.overallRate")}</span>
                    <Badge
                      variant={ytdAttendanceRate >= 95 ? "default" : ytdAttendanceRate >= 90 ? "secondary" : "destructive"}
                    >
                      {ytdAttendanceRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("attendance.totalPresentDays")}</span>
                    <span className="font-medium">{yearToDateStats.totalPresentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("attendance.totalWorkingDays")}</span>
                    <span className="font-medium">{yearToDateStats.totalWorkingDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("attendance.totalLeaveDays")}</span>
                    <span className="font-medium">{yearToDateStats.totalLeaveDays}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">{t("attendance.totalLateDays")}</span>
                    <span className="font-medium">{yearToDateStats.totalLateDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("attendance.totalAbsentDays")}</span>
                    <span className="font-medium">{yearToDateStats.totalAbsentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("attendance.totalOvertimeHours")}</span>
                    <span className="font-medium">{yearToDateStats.totalOvertimeHours}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t("attendance.evaluation")}</span>
                    <Badge variant={ytdAttendanceRate >= 95 ? "default" : "secondary"}>
                      {ytdAttendanceRate >= 95 ? "Xuất sắc" : ytdAttendanceRate >= 90 ? "Tốt" : "Cần cải thiện"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly History */}
          <Card>
            <CardHeader>
              <CardTitle>{t("attendance.attendanceHistory")}</CardTitle>
              <CardDescription>{t("attendance.monthlyHistory").replace("{year}", selectedYear)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("attendance.month")}</TableHead>
                      <TableHead className="text-right">{t("attendance.workingDays")}</TableHead>
                      <TableHead className="text-right">{t("attendance.presentDays")}</TableHead>
                      <TableHead className="text-right">{t("attendance.leaveDays")}</TableHead>
                      <TableHead className="text-right">{t("attendance.lateDays")}</TableHead>
                      <TableHead className="text-right">{t("attendance.absentDays")}</TableHead>
                      <TableHead className="text-right">{t("attendance.overtimeHours")}</TableHead>
                      <TableHead className="text-right">{t("attendance.attendanceRate")}</TableHead>
                      <TableHead>{t("attendance.leaveType")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.length > 0 ? (
                      filteredAttendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.month}</TableCell>
                          <TableCell className="text-right">{record.workingDays}</TableCell>
                          <TableCell className="text-right">{record.presentDays}</TableCell>
                          <TableCell className="text-right">{record.leaveDays}</TableCell>
                          <TableCell className="text-right">{record.lateDays}</TableCell>
                          <TableCell className="text-right">{record.absentDays}</TableCell>
                          <TableCell className="text-right">{record.overtimeHours}h</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                record.attendanceRate >= 95
                                  ? "default"
                                  : record.attendanceRate >= 90
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {record.attendanceRate}%
                            </Badge>
                          </TableCell>
                          <TableCell>{record.leaveType}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {t("attendance.noDataForYear").replace("{year}", selectedYear)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
