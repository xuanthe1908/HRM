"use client"

 import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { attendanceService, employeeService, departmentService, positionService } from "@/lib/services"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Upload, UserCheck, Save, Loader2, Search, X, FileText, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Employee, Attendance, Department, Position } from "@/lib/services"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AttendanceSummary {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  total_work_days: number;
  total_overtime_days: number;
  total_paid_leave: number;
  total_unpaid_leave: number;
  total_overtime_hours: number;
}

interface ParsedRow {
  employee_code: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    employee_code: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    employee_code: string;
    message: string;
  }>;
}

export default function AttendancePage() {
  const { toast } = useToast()
  const [summaryData, setSummaryData] = useState<AttendanceSummary[]>([])
  const [originalSummaryData, setOriginalSummaryData] = useState<AttendanceSummary[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedPosition, setSelectedPosition] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // States for timesheet editing
  const [timesheetData, setTimesheetData] = useState<Record<string, Record<number, Partial<Attendance>>>>({})
  const [originalData, setOriginalData] = useState<Record<string, Record<number, Partial<Attendance>>>>({})
  const [isCellDialogOpen, setIsCellDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; day: number } | null>(null)
  const [tempData, setTempData] = useState<{ workValue: string; lateMinutes: string; earlyMinutes: string; overtimeHours: string; checkInTime: string; checkOutTime: string }>({ workValue: '0', lateMinutes: '0', earlyMinutes: '0', overtimeHours: '0', checkInTime: '', checkOutTime: '' })

  // CSV Import states for timesheet
  const [timesheetFile, setTimesheetFile] = useState<File | null>(null)
  const [timesheetParsedRows, setTimesheetParsedRows] = useState<ParsedRow[]>([])
  const [timesheetParsing, setTimesheetParsing] = useState(false)
  const [timesheetDragActive, setTimesheetDragActive] = useState(false)

  // CSV Import states
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Sort employees by employee_code ascending for timesheet display
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''))
  }, [employees])

  // Sort summary rows by employee_code ascending for summary table
  const sortedSummaryData = useMemo(() => {
    return [...summaryData].sort((a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''))
  }, [summaryData])

  // Count days with missing in/out (including auto-checkout tagged ones)
  const missingInOutCount = useMemo(() => {
    let count = 0
    Object.values(timesheetData).forEach(empDays => {
      Object.values(empDays).forEach((rec: any) => {
        const partial = (!!rec?.check_in_time && !rec?.check_out_time) || (!rec?.check_in_time && !!rec?.check_out_time) || rec?.notes === 'auto_checkout_17:30'
        if (partial) count += 1
      })
    })
    return count
  }, [timesheetData])

  const fetchData = async (month: string, year: string) => {
    setLoading(true)
    const [summaryRes, employeesRes, attendanceRes, departmentsRes, positionsRes] = await Promise.all([
      attendanceService.getAttendanceSummary(parseInt(month), parseInt(year)),
      employeeService.getEmployees(),
      attendanceService.getAttendances(parseInt(month), parseInt(year)),
      departmentService.getDepartments(),
      positionService.getPositions()
    ]);
    
    if (summaryRes.data) {
      setSummaryData(summaryRes.data)
      setOriginalSummaryData(summaryRes.data)
    } else {
      console.error("Failed to fetch attendance summary:", summaryRes.error);
      setSummaryData([]);
      setOriginalSummaryData([]);
    }
    
    if (employeesRes.data) {
      setEmployees(employeesRes.data)
    }
    
    if (attendanceRes.data) {
      setAttendances(attendanceRes.data)
    }
    
    if (departmentsRes.data) {
      setDepartments(departmentsRes.data)
    }
    
    if (positionsRes.data) {
      setPositions(positionsRes.data)
    }
    
    setLoading(false)
  }

  // Filter function
  const applyFilters = () => {
    let filtered = [...originalSummaryData];

    // Filter by search term (employee name or code)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.employee_name.toLowerCase().includes(term) ||
        item.employee_code.toLowerCase().includes(term)
      );
    }

    // Filter by department
    if (selectedDepartment !== "all") {
      const employeesInDepartment = employees
        .filter(emp => emp.department?.id === selectedDepartment)
        .map(emp => emp.id);
      
      filtered = filtered.filter(item => 
        employeesInDepartment.includes(item.employee_id)
      );
    }

    // Filter by position
    if (selectedPosition !== "all") {
      const employeesInPosition = employees
        .filter(emp => emp.position?.id === selectedPosition)
        .map(emp => emp.id);
      
      filtered = filtered.filter(item => 
        employeesInPosition.includes(item.employee_id)
      );
    }

    // Filter by status
    if (selectedStatus !== "all") {
      const employeesWithStatus = employees
        .filter(emp => emp.status === selectedStatus)
        .map(emp => emp.id);
      
      filtered = filtered.filter(item => 
        employeesWithStatus.includes(item.employee_id)
      );
    }

    setSummaryData(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedDepartment("all");
    setSelectedPosition("all");
    setSelectedStatus("all");
    setSearchTerm("");
  };

  // Apply filters when filter values change
  useEffect(() => {
    if (originalSummaryData.length > 0) {
      applyFilters();
    }
  }, [selectedDepartment, selectedPosition, selectedStatus, searchTerm, originalSummaryData, employees]);

  const openTimesheet = () => {
    const year = parseInt(selectedYear)
    const month = parseInt(selectedMonth)
    
    const filtered = attendances.filter(att => {
      const attDate = new Date(att.date)
      return attDate.getFullYear() === year && attDate.getMonth() + 1 === month
    })

    const data: Record<string, Record<number, Attendance>> = {}
    filtered.forEach(att => {
      const day = new Date(att.date).getDate()
      if (!data[att.employee_id]) {
        data[att.employee_id] = {}
      }
      data[att.employee_id][day] = att
    })
    
    setTimesheetData(data)
    setOriginalData(JSON.parse(JSON.stringify(data)))
    setIsTimesheetOpen(true)
  }

  const handleCellClick = (employeeId: string, day: number) => {
    const record = timesheetData[employeeId]?.[day];
    
    // Convert TIMESTAMPTZ back to HH:MM format for display
    let checkInTime = '';
    let checkOutTime = '';
    
    if (record?.check_in_time) {
      const checkInDate = new Date(record.check_in_time);
      checkInTime = `${checkInDate.getHours().toString().padStart(2, '0')}:${checkInDate.getMinutes().toString().padStart(2, '0')}`;
    }
    
    if (record?.check_out_time) {
      const checkOutDate = new Date(record.check_out_time);
      checkOutTime = `${checkOutDate.getHours().toString().padStart(2, '0')}:${checkOutDate.getMinutes().toString().padStart(2, '0')}`;
    }

    // If this is an auto-checkout or missing checkout, pre-calc workValue from check-in to 17:30
    let prefillWorkValue: string = '0';
    const isAutoCheckout = record?.notes === 'auto_checkout_17:30' || (record?.check_in_time && !record?.check_out_time);
    if (record?.work_value !== undefined) {
      prefillWorkValue = record.work_value.toString();
    } else if (isAutoCheckout && record?.check_in_time) {
      const inDate = new Date(record.check_in_time);
      const outDate = new Date(`${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}T17:30:00`);
      const workHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60));
      prefillWorkValue = (Math.min(1.0, Math.max(0, Math.round((workHours / 8) * 100) / 100))).toString();
    }
    
    setTempData({
        workValue: prefillWorkValue,
        lateMinutes: record?.late_minutes?.toString() || '0',
        earlyMinutes: record?.early_minutes?.toString() || '0',
        overtimeHours: record?.overtime_hours?.toString() || '0',
        checkInTime: checkInTime,
        checkOutTime: '' // Always leave checkout time empty in modal for missing checkout cases
    });
    setSelectedCell({ employeeId, day });
    setIsCellDialogOpen(true);
  };

  // Auto-calculate work value when check-in/out times change
  const calculateWorkValueFromTimes = (checkIn: string, checkOut: string) => {
    if (!checkIn || !selectedCell) return tempData.workValue;
    
    // If checkout is empty, treat it as 17:30 for calculation
    const effectiveCheckOut = checkOut || '17:30';
    
    // For auto-checkout cases, use the same logic as timesheet grid display
    const record = timesheetData[selectedCell.employeeId]?.[selectedCell.day];
    if (record?.check_in_time && !record?.check_out_time) {
      // Use the stored check-in time and calculate to 17:30 on the same date
      const inDate = new Date(record.check_in_time);
      const outDate = new Date(`${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}T17:30:00`);
      const workHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60));
      return (Math.min(1.0, Math.max(0, Math.round((workHours / 8) * 100) / 100))).toString();
    }
    
    // For normal cases, use the input times with the correct date
    const currentYear = new Date().getFullYear();
    const monthIndex = parseInt(selectedMonth) - 1; // Convert 1-based month to 0-based
    const baseDate = new Date(currentYear, monthIndex, selectedCell.day);
    
    const inTime = parseTime(checkIn, baseDate);
    const outTime = parseTime(effectiveCheckOut, baseDate);
    
    if (!inTime || !outTime) return tempData.workValue;
    
    const workHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
    const calculatedValue = Math.min(1.0, Math.round((workHours / 8) * 100) / 100);
    
    return calculatedValue.toString();
  };

  const handleTimeChange = (field: 'checkInTime' | 'checkOutTime', value: string) => {
    const newData = { ...tempData, [field]: value };
    
    // Auto-calculate work value if checkin is provided (checkout can be empty, treated as 17:30)
    if (newData.checkInTime) {
      const calculatedWorkValue = calculateWorkValueFromTimes(newData.checkInTime, newData.checkOutTime);
      newData.workValue = calculatedWorkValue;
    }
    
    setTempData(newData);
  };

  const handleCellUpdate = () => {
    if (!selectedCell) return;
    const { employeeId, day } = selectedCell;

    const date = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const workValue = Math.min(1.0, Math.round((parseFloat(tempData.workValue) || 0) * 100) / 100); // Round to 2 decimal places, max 1.0
    const lateMinutes = Math.round(parseFloat(tempData.lateMinutes) || 0); // Ensure integer
    const earlyMinutes = Math.round(parseFloat(tempData.earlyMinutes) || 0); // Ensure integer
    const overtimeHours = Math.round((parseFloat(tempData.overtimeHours) || 0) * 100) / 100; // Round to 2 decimal places
    
    // Convert time strings to proper TIMESTAMPTZ format
    let checkInTime: string | undefined;
    let checkOutTime: string | undefined;
    
    if (tempData.checkInTime && tempData.checkInTime.trim() !== '') {
      try {
        const norm = normalizeTimeToHHMMSS(tempData.checkInTime);
        if (norm) {
          const checkInDateTime = new Date(`${dateStr}T${norm}`);
          if (!isNaN(checkInDateTime.getTime())) {
            checkInTime = checkInDateTime.toISOString();
          }
        }
      } catch (error) {
        console.warn('Invalid check-in time:', tempData.checkInTime, error);
      }
    }
    
    if (tempData.checkOutTime && tempData.checkOutTime.trim() !== '') {
      try {
        const norm = normalizeTimeToHHMMSS(tempData.checkOutTime);
        if (norm) {
          const checkOutDateTime = new Date(`${dateStr}T${norm}`);
          if (!isNaN(checkOutDateTime.getTime())) {
            checkOutTime = checkOutDateTime.toISOString();
          }
        }
      } catch (error) {
        console.warn('Invalid check-out time:', tempData.checkOutTime, error);
      }
    } else if (tempData.checkInTime && tempData.checkInTime.trim() !== '') {
      // Auto set checkout to 17:30:00 when missing but checkin exists
      const checkOutDateTime = new Date(`${dateStr}T17:30:00`);
      checkOutTime = checkOutDateTime.toISOString();
    }
    
    // Determine status based on work value and day of week
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let status: Attendance['status'] = 'absent';
    if (workValue > 0 && isWeekend) {
        status = 'weekend_overtime' as Attendance['status'];
    } else if (workValue >= 1) {
        status = 'present_full' as Attendance['status'];
    } else if (workValue > 0) {
        status = 'present_half' as Attendance['status'];
    }
    
    // Calculate day of week in Vietnamese format
    const dayOfWeekVN = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
    
    const hasBothTimes = !!checkInTime && !!checkOutTime;
    const isAutoCheckout = !!checkInTime && !tempData.checkOutTime;
    const updatedRecord: Partial<Attendance> = { 
      employee_id: employeeId, 
      date: dateStr, 
      status: hasBothTimes ? status : 'absent',
      work_value: hasBothTimes ? workValue : 0,
      late_minutes: hasBothTimes ? lateMinutes : 0,
      early_minutes: hasBothTimes ? earlyMinutes : 0,
      overtime_hours: hasBothTimes ? overtimeHours : 0,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      total_minutes: hasBothTimes ? Math.round(workValue * 480) : 0,
      notes: isAutoCheckout ? 'auto_checkout_17:30' : undefined,
      day_of_week: dayOfWeekVN
    };

    setTimesheetData(prev => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [day]: updatedRecord } }));
    setIsCellDialogOpen(false);
  };

  const handleSaveTimesheet = async () => {
    setIsSubmitting(true)
    const promises: Promise<any>[] = []
    
    Object.values(timesheetData).forEach(empRecords => {
      Object.values(empRecords).forEach(current => {
        const original = originalData[current.employee_id!]?.[new Date(current.date!).getDate()];
        if (JSON.stringify(current) !== JSON.stringify(original)) {
            const payload = { ...current };
            delete payload.id;
            if(original) {
                promises.push(attendanceService.updateAttendance(original.id!, payload));
            } else {
                promises.push(attendanceService.createAttendance(payload as any));
    }
  }
      });
    });
    
    try {
      await Promise.all(promises);
      toast({ title: "Thành công", description: "Đã lưu bảng chấm công." })
      fetchData(selectedMonth, selectedYear)
    } catch (error) {
        toast({ title: "Lỗi", description: "Không thể lưu chấm công.", variant: "destructive" })

    } finally {
        setIsSubmitting(false)
        setIsTimesheetOpen(false)
    }
  }

  // CSV Import functions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const fileName = droppedFile.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      if (isCSV || isExcel) {
        setFile(droppedFile);
        setImportResult(null);
        handleFileParse(droppedFile);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileName = selectedFile.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      if (isCSV || isExcel) {
        setFile(selectedFile);
        setImportResult(null);
        handleFileParse(selectedFile);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileParse = async (file: File) => {
    setParsing(true);
    try {
      const text = await file.text();
      const parsed = parseMitaproDetailCSV(text);
      setParsedRows(parsed);
    } catch (err) {
      console.error(err);
      setParsedRows([]);
      toast({
        title: "Lỗi",
        description: "Không thể đọc file CSV",
        variant: "destructive"
      });
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/attendance/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi upload file');
      }

      setImportResult(data);
      
      if (data.success > 0) {
        toast({
          title: "Thành công",
          description: `Đã import ${data.success} bản ghi chấm công`,
        });
        fetchData(selectedMonth, selectedYear);
        setIsImportOpen(false);
      }

      if (data.failed > 0) {
        toast({
          title: "Cảnh báo",
          description: `${data.failed} bản ghi bị lỗi, vui lòng kiểm tra chi tiết`,
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : 'Lỗi không xác định',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Mã nhân viên,Tên nhân viên,Ngày,Giờ vào,Giờ ra,Tổng giờ,Trạng thái,Ghi chú
00001,Nguyễn Văn A,01/12/2024,08:00,17:00,8.0,Đi làm,
00002,Trần Thị B,01/12/2024,08:30,17:30,8.0,Đi làm,Đi muộn
00003,Lê Văn C,01/12/2024,-,-,0,Nghỉ phép,`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate work value based on check-in/out times with standard work hours (8:30 AM - 5:30 PM)
  const calculateWorkValue = (checkIn: string, checkOut: string, date: Date): {
    workValue: number;
    status: string;
    overtimeHours: number;
    lateMinutes: number;
    earlyMinutes: number;
  } => {
    // Parse times
    const inTime = parseTime(checkIn, date);
    const outTime = parseTime(checkOut, date);
    
    if (!inTime || !outTime) {
      return { workValue: 0, status: 'absent', overtimeHours: 0, lateMinutes: 0, earlyMinutes: 0 };
    }
    
    // Standard work day: 8:30 AM - 5:30 PM (9 hours with 1-hour lunch break = 8 hours work)
    const standardStartHour = 8;
    const standardStartMinute = 30;
    const standardEndHour = 17;
    const standardEndMinute = 30;
    const standardWorkHours = 8; // 8 hours of actual work
    
    // Calculate total work hours
    const workHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
    
    // Calculate late/early minutes based on standard hours
    const standardStartMinutes = standardStartHour * 60 + standardStartMinute;
    const standardEndMinutes = standardEndHour * 60 + standardEndMinute;
    const inMinutes = inTime.getHours() * 60 + inTime.getMinutes();
    const outMinutes = outTime.getHours() * 60 + outTime.getMinutes();
    
    const lateMinutes = Math.max(0, inMinutes - standardStartMinutes);
    const earlyMinutes = Math.max(0, standardEndMinutes - outMinutes);
    
    // Calculate work value: total work time divided by 8, capped at 1.0
    const workValue = Math.min(1.0, Math.max(0, Math.round((workHours / 8) * 100) / 100)); // Clamp to [0,1], 2 decimals
    
    // Ensure late and early minutes are integers
    const lateMinutesInt = Math.round(lateMinutes);
    const earlyMinutesInt = Math.round(earlyMinutes);
    
    // Determine status based on work value
    let status: string;
    let overtimeHours = 0;
    
    // Weekend handling
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (workValue >= 1) {
      status = isWeekend ? 'weekend_overtime' : 'present_full';
      overtimeHours = isWeekend ? Math.round(workHours * 100) / 100 : Math.round(Math.max(0, workHours - standardWorkHours) * 100) / 100;
    } else if (workValue > 0) {
      status = isWeekend ? 'weekend_overtime' : 'present_half';
      overtimeHours = isWeekend ? Math.round(workHours * 100) / 100 : 0;
    } else {
      status = 'absent';
      overtimeHours = 0;
    }
    
    return { workValue, status, overtimeHours, lateMinutes: lateMinutesInt, earlyMinutes: earlyMinutesInt };
  };

  // Parse time string to Date object
  const parseTime = (timeStr: string, baseDate: Date): Date | null => {
    if (!timeStr || timeStr === '' || timeStr === '-') return null;
    
    try {
      // Support H:MM, HH:MM, H:MM:SS, HH:MM:SS formats
      const match = timeStr.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
      if (!match) return null;
      
      const [, hours, minutes, seconds = '0'] = match;
      const hourNum = parseInt(hours);
      const minuteNum = parseInt(minutes);
      const secondNum = parseInt(seconds);
      
      // Validate time values
      if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59 || secondNum < 0 || secondNum > 59) {
        return null;
      }
      
      const date = new Date(baseDate);
      date.setHours(hourNum, minuteNum, secondNum);
      
      // Validate the resulting date
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.warn('Error parsing time:', timeStr, error);
      return null;
    }
  };

  // Normalize time string to HH:MM:SS (pads single-digit parts)
  const normalizeTimeToHHMMSS = (timeStr: string): string | null => {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match) return null;
    const hours = String(Math.max(0, Math.min(23, parseInt(match[1])))).padStart(2, '0');
    const minutes = String(Math.max(0, Math.min(59, parseInt(match[2])))).padStart(2, '0');
    const seconds = String(Math.max(0, Math.min(59, match[3] ? parseInt(match[3]) : 0))).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // CSV Import functions for timesheet
  const handleTimesheetDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setTimesheetDragActive(true);
    } else if (e.type === "dragleave") {
      setTimesheetDragActive(false);
    }
  };

  const handleTimesheetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTimesheetDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const fileName = droppedFile.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      if (isCSV || isExcel) {
        setTimesheetFile(droppedFile);
        handleTimesheetFileParse(droppedFile);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)",
          variant: "destructive"
        });
      }
    }
  };

  const handleTimesheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileName = selectedFile.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      if (isCSV || isExcel) {
        setTimesheetFile(selectedFile);
        handleTimesheetFileParse(selectedFile);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)",
          variant: "destructive"
        });
      }
    }
  };

  const handleTimesheetFileParse = async (file: File) => {
    setTimesheetParsing(true);
    try {
      const text = await file.text();
      const parsed = parseMitaproDetailCSV(text);
      setTimesheetParsedRows(parsed);
    } catch (err) {
      console.error(err);
      setTimesheetParsedRows([]);
      toast({
        title: "Lỗi",
        description: "Không thể đọc file CSV",
        variant: "destructive"
      });
    } finally {
      setTimesheetParsing(false);
    }
  };

  const applyCSVToTimesheet = () => {
    if (timesheetParsedRows.length === 0) return;

    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const newTimesheetData = { ...timesheetData };

    timesheetParsedRows.forEach(row => {
      // Convert employee code from CSV format to database format
      const dbEmployeeCode = normalizeToNV(row.employee_code);
      
      // Find employee by code
      const employee = employees.find(emp => emp.employee_code === dbEmployeeCode);
      if (!employee) {
        toast({
          title: "Cảnh báo",
          description: `Không tìm thấy nhân viên với mã ${dbEmployeeCode}`,
          variant: "destructive"
        });
        return;
      }

      // Parse date
      const [day, monthStr, yearStr] = row.date.split('/');
      const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(day));
      
      // Check if date is in the selected month/year
      if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
        return;
      }

      const dayOfMonth = date.getDate();
      
      // Calculate work value and other data
      // Determine normalized times first
      // If either in/out time is missing, we will not compute workday
      const workData = (row.check_in && row.check_out)
        ? calculateWorkValue(row.check_in, row.check_out, date)
        : { workValue: undefined as unknown as number, status: 'absent', overtimeHours: 0, lateMinutes: 0, earlyMinutes: 0 };
      
      // Calculate day of week in Vietnamese format
      const dayOfWeek = date.getDay();
      const dayOfWeekVN = dayOfWeek === 0 ? 'CN' : `T.${dayOfWeek + 1}`;
      
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Convert CSV time strings to proper TIMESTAMPTZ format
      let checkInTime: string | undefined;
      let checkOutTime: string | undefined;
      
      if (row.check_in && row.check_in.trim() !== '') {
        try {
          const norm = normalizeTimeToHHMMSS(row.check_in);
          if (norm) {
            const checkInDateTime = new Date(`${dateStr}T${norm}`);
            if (!isNaN(checkInDateTime.getTime())) {
              checkInTime = checkInDateTime.toISOString();
            }
          }
        } catch (error) {
          console.warn('Invalid check-in time:', row.check_in, error);
        }
      }
      
      if (row.check_out && row.check_out.trim() !== '') {
        try {
          const norm = normalizeTimeToHHMMSS(row.check_out);
          if (norm) {
            const checkOutDateTime = new Date(`${dateStr}T${norm}`);
            if (!isNaN(checkOutDateTime.getTime())) {
              checkOutTime = checkOutDateTime.toISOString();
            }
          }
        } catch (error) {
          console.warn('Invalid check-out time:', row.check_out, error);
        }
      } else if (row.check_in && row.check_in.trim() !== '') {
        // Auto set checkout to 17:30:00 when missing but checkin exists
        const checkOutDateTime = new Date(`${dateStr}T17:30:00`);
        checkOutTime = checkOutDateTime.toISOString();
      }

      const hasBothTimes = !!checkInTime && !!checkOutTime;
      const isAutoCheckout = hasBothTimes && (!row.check_out || row.check_out.trim() === '');
      const attendanceRecord: Partial<Attendance> = {
        employee_id: employee.id,
        date: dateStr,
        status: hasBothTimes ? (workData.status as Attendance['status']) : 'absent',
        work_value: hasBothTimes ? workData.workValue : 0,
        late_minutes: hasBothTimes ? Math.round(workData.lateMinutes) : 0,
        early_minutes: hasBothTimes ? Math.round(workData.earlyMinutes) : 0,
        overtime_hours: hasBothTimes ? workData.overtimeHours : 0,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        total_minutes: hasBothTimes && workData.workValue !== undefined ? Math.round(workData.workValue * 480) : 0,
        notes: isAutoCheckout ? 'auto_checkout_17:30' : undefined,
        day_of_week: dayOfWeekVN
      };

      if (!newTimesheetData[employee.id]) {
        newTimesheetData[employee.id] = {};
      }
      newTimesheetData[employee.id][dayOfMonth] = attendanceRecord;
    });

    setTimesheetData(newTimesheetData);
    setTimesheetParsedRows([]);
    setTimesheetFile(null);
    
    toast({
      title: "Thành công",
      description: `Đã áp dụng ${timesheetParsedRows.length} bản ghi vào bảng chấm công`,
    });
  };
  
  useEffect(() => {
    fetchData(selectedMonth, selectedYear)
  }, [selectedMonth, selectedYear])

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thống kê chấm công</h1>
          <p className="text-muted-foreground">Bảng tổng hợp công, phép và tăng ca của nhân viên theo tháng.</p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Chấm Công
          </Button> */}
          <Button onClick={openTimesheet}>
            <UserCheck className="mr-2 h-4 w-4" />
            Chấm công
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bảng tổng hợp công</CardTitle>
          
          {/* Time filters */}
          <div className="flex items-center gap-4 pt-4">
             <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <SelectItem key={month} value={String(month)}>Tháng {month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search and other filters */}
          <div className="space-y-4 pt-4">
            {/* Search box */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
            </Button>
              )}
          </div>

            {/* Filter selects */}
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Chức vụ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chức vụ</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Đang làm việc</SelectItem>
                  <SelectItem value="inactive">Tạm nghỉ</SelectItem>
                  <SelectItem value="terminated">Đã nghỉ việc</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear filters button */}
              {(selectedDepartment !== "all" || selectedPosition !== "all" || selectedStatus !== "all" || searchTerm) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Hiển thị {summaryData.length} / {originalSummaryData.length} nhân viên
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
          </div>
          ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NV</TableHead>
                  <TableHead>Tên nhân viên</TableHead>
                    <TableHead className="text-right">Công bình thường</TableHead>
                    <TableHead className="text-right">Công tăng ca</TableHead>
                    <TableHead className="text-right">Nghỉ phép</TableHead>
                    <TableHead className="text-right">Nghỉ không lương</TableHead>
                    <TableHead className="text-right">Tăng ca (giờ)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {sortedSummaryData.length > 0 ? sortedSummaryData.map((row) => (
                      <TableRow key={row.employee_id}>
                          <TableCell className="font-mono">{row.employee_code}</TableCell>
                          <TableCell className="font-medium">{row.employee_name}</TableCell>
                          <TableCell className="text-right">{row.total_work_days.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{row.total_overtime_days.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{row.total_paid_leave}</TableCell>
                          <TableCell className="text-right">{row.total_unpaid_leave}</TableCell>
                          <TableCell className="text-right">{row.total_overtime_hours.toFixed(2)}</TableCell>
                  </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center">Không có dữ liệu chấm công cho tháng này.</TableCell></TableRow>
                  )}


              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>

            {/* Timesheet Dialog */}
      <Dialog open={isTimesheetOpen} onOpenChange={setIsTimesheetOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chấm công tháng {selectedMonth}/{selectedYear}</DialogTitle>
            <DialogDescription>Click vào ô để thay đổi trạng thái chấm công hoặc import CSV để tự động điền dữ liệu.</DialogDescription>
          </DialogHeader>
          
          {/* CSV Import Section */}
          <div className="border-b pb-4 mb-4">
            {/* <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Import CSV từ máy chấm công</h3>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Tải template
              </Button>
            </div> */}
            
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                timesheetDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleTimesheetDrag}
              onDragLeave={handleTimesheetDrag}
              onDragOver={handleTimesheetDrag}
              onDrop={handleTimesheetDrop}
            >
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {timesheetFile ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={timesheetFile.name.toLowerCase().endsWith('.csv') ? 'default' : 'secondary'}>
                      {timesheetFile.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel'}
                    </Badge>
                    <p className="font-medium text-sm">{timesheetFile.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTimesheetFile(null)}>
                      Chọn file khác
                    </Button>
                    {timesheetParsedRows.length > 0 && (
                      <Button size="sm" onClick={applyCSVToTimesheet}>
                        Áp dụng vào bảng chấm công
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Kéo thả file CSV hoặc Excel vào đây hoặc click để chọn file
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleTimesheetFileChange}
                    className="hidden"
                    id="timesheet-file-upload"
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('timesheet-file-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Chọn file CSV/Excel
                  </Button>
                </div>
              )}
              {timesheetParsing && (
                <div className="mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs text-muted-foreground mt-1">Đang đọc file...</p>
                </div>
              )}
            </div>

            {/* Preview parsed data removed by request */}
          </div>

          {/* Color Legend + Missing Count */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Chú thích màu sắc:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                <span>Xanh lá: Làm đủ ngày (1.00 công)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
                <span>Vàng: Làm nửa ngày (0.01-0.99 công)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
                <span>Đỏ: Dữ liệu không đầy đủ (thiếu giờ vào/ra)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                <span>Xám: Nghỉ phép/không lương</span>
              </div>
            </div>
            <p className="text-xs text-red-700 mt-3">
              Số ngày thiếu giờ ra: <span className="font-semibold">{missingInOutCount}</span>
            </p>
          </div>

          <div className="h-[60vh] overflow-auto overflow-x-auto relative">
            <Table className="min-w-max">
              <TableHeader className="bg-background">
                  <TableRow>
                  <TableHead className="sticky top-0 left-0 bg-background z-30 w-[200px] min-w-[200px] max-w-[200px]">Nhân viên</TableHead>
                  {Array.from({ length: new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate() }, (_, i) => i + 1).map(day => {
                    const date = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
                    const dayOfWeek = date.getDay();
                    const dayOfWeekVN = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
                    return (
                      <TableHead key={day} className="sticky top-0 bg-background z-20 text-center w-[70px] min-w-[70px] max-w-[70px]">
                        <div className="flex flex-col">
                          <span className="font-medium">{day}</span>
                          <span className="text-xs text-muted-foreground">{dayOfWeekVN}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                  </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmployees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="sticky left-0 bg-background z-10 w-[200px] min-w-[200px] max-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{emp.employee_code}</span>
                      </div>
                    </TableCell>
                    {Array.from({ length: new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate() }, (_, i) => i + 1).map(day => {
                      const record = timesheetData[emp.id]?.[day];
                      const workValue = record?.work_value;
                      const dayRecord = timesheetData[emp.id]?.[day];
                      const hasPartialTimes = (!!dayRecord?.check_in_time && !dayRecord?.check_out_time) || (!dayRecord?.check_in_time && !!dayRecord?.check_out_time) || dayRecord?.notes === 'auto_checkout_17:30';
                      const isAutoCheckout = dayRecord?.notes === 'auto_checkout_17:30';
                      
                      // For auto-checkout cases, calculate workday from check-in to 17:30
                      let displayWorkValue = workValue;
                      if (isAutoCheckout && dayRecord?.check_in_time) {
                        const checkInDate = new Date(dayRecord.check_in_time);
                        const checkOutDate = new Date(`${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}T17:30:00`);
                        const workHours = Math.max(0, (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
                        displayWorkValue = Math.min(1.0, Math.max(0, Math.round((workHours / 8) * 100) / 100));
                      }
                      
                      const bgColor = hasPartialTimes
                        ? 'bg-red-100 text-red-800'
                        : workValue 
                          ? workValue === 1 ? 'bg-green-100 text-green-800' 
                          : workValue > 0 ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100'
                          : '';
                      return (
                        <TableCell key={day} className="text-center p-1 w-[70px] min-w-[70px] max-w-[70px]" onClick={() => handleCellClick(emp.id, day)}>
                          <div className={`w-full h-10 rounded cursor-pointer flex items-center justify-center text-sm font-medium ${bgColor || 'border border-dashed'}`}>
                            {displayWorkValue !== undefined ? displayWorkValue : (dayRecord?.check_in_time || dayRecord?.check_out_time ? '' : '+')}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimesheetOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveTimesheet} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cell Edit Dialog */}
      <Dialog open={isCellDialogOpen} onOpenChange={setIsCellDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Nhập số công</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                {/* Show date and stored time information */}
                {selectedCell && (() => {
                  const record = timesheetData[selectedCell.employeeId]?.[selectedCell.day];
                  const date = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, selectedCell.day);
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  
                  // Convert stored TIMESTAMPTZ to display format
                  let storedCheckIn = '';
                  let storedCheckOut = '';
                  
                  if (record?.check_in_time) {
                    const checkInDate = new Date(record.check_in_time);
                    storedCheckIn = `${checkInDate.getHours().toString().padStart(2, '0')}:${checkInDate.getMinutes().toString().padStart(2, '0')}`;
                  }
                  
                  if (record?.check_out_time) {
                    const checkOutDate = new Date(record.check_out_time);
                    storedCheckOut = `${checkOutDate.getHours().toString().padStart(2, '0')}:${checkOutDate.getMinutes().toString().padStart(2, '0')}`;
                  }
                  
                  return (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Thông tin chấm công</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Ngày:</span>
                          <span className="ml-2">{dateStr}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Thứ:</span>
                          <span className="ml-2">{date.getDay() === 0 ? 'CN' : `T${date.getDay() + 1}`}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Giờ vào (đã lưu):</span>
                          <span className="ml-2 font-mono">{storedCheckIn || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Giờ ra (đã lưu):</span>
                          <span className="ml-2 font-mono">{storedCheckOut || '-'}</span>
                          {record && record.check_in_time && !record.check_out_time && (
                            <p className="text-xs text-red-600 mt-1">Thiếu giờ ra</p>
                          )}
                          {record && record.notes === 'auto_checkout_17:30' && (
                            <p className="text-xs text-red-600 mt-1">Thiếu giờ ra</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Check-in/out time inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="checkInTime">Giờ vào (HH:MM)</Label>
                        <Input 
                            id="checkInTime"
                            type="time" 
                            value={tempData.checkInTime} 
                            onChange={(e) => handleTimeChange('checkInTime', e.target.value)}
                            placeholder="08:30"
                        />
                    </div>
                    <div>
                        <Label htmlFor="checkOutTime">Giờ ra (HH:MM)</Label>
                        <Input 
                            id="checkOutTime"
                            type="time" 
                            value={tempData.checkOutTime} 
                            onChange={(e) => handleTimeChange('checkOutTime', e.target.value)}
                            placeholder="17:30"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="workValue">Số công (tổng giờ làm việc ÷ 8, tối đa 1.00)</Label>
                    <Input 
                        id="workValue"
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="1" 
                        value={tempData.workValue} 
                        onChange={(e) => setTempData(p => ({...p, workValue: e.target.value}))}
                        placeholder="Ví dụ: 1.00, 0.75, 0.50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Số công = Tổng giờ làm việc ÷ 8</p>
                    {selectedCell && (
                      (!!timesheetData[selectedCell.employeeId]?.[selectedCell.day]?.check_in_time && !timesheetData[selectedCell.employeeId]?.[selectedCell.day]?.check_out_time) ||
                      (timesheetData[selectedCell.employeeId]?.[selectedCell.day]?.notes === 'auto_checkout_17:30')
                    ) && (
                       <p className="text-xs text-red-600 mt-1">⚠️ Đang giả định giờ ra là 17:30 để tính toán</p>
                     )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="lateMinutes">Số phút đi trễ</Label>
                        <Input 
                            id="lateMinutes"
                            type="number" 
                            min="0" 
                            value={tempData.lateMinutes} 
                            onChange={(e) => setTempData(p => ({...p, lateMinutes: e.target.value}))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="earlyMinutes">Số phút về sớm</Label>
                        <Input 
                            id="earlyMinutes"
                            type="number" 
                            min="0" 
                            value={tempData.earlyMinutes} 
                            onChange={(e) => setTempData(p => ({...p, earlyMinutes: e.target.value}))}
                        />
                    </div>
                </div>
                <div>
                    <Label htmlFor="overtimeHours">Giờ tăng ca</Label>
                    <Input 
                        id="overtimeHours"
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={tempData.overtimeHours} 
                        onChange={(e) => setTempData(p => ({...p, overtimeHours: e.target.value}))}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCellDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCellUpdate}>Xác nhận</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Dữ Liệu Chấm Công</DialogTitle>
            <DialogDescription>
              Tải lên file CSV từ máy chấm công Mitapro. Hệ thống sẽ tự động chuyển đổi mã nhân viên và tính toán công làm việc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Download Template */}
            {/* <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium">Tải template mẫu</h4>
                <p className="text-sm text-muted-foreground">
                  Tải file CSV mẫu để hiểu cấu trúc dữ liệu cần thiết
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Tải template
              </Button>
            </div> */}

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {file ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={file.name.toLowerCase().endsWith('.csv') ? 'default' : 'secondary'}>
                      {file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel'}
                    </Badge>
                    <p className="font-medium">{file.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                    Chọn file khác
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Kéo thả file CSV hoặc Excel vào đây hoặc click để chọn file
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Chọn file CSV/Excel
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Button */}
            {file && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload và Import
                  </>
                )}
              </Button>
            )}

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Dữ liệu đã đọc từ file:</h4>
                <div className="rounded-md border max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã NV (CSV)</TableHead>
                        <TableHead>Mã NV (DB)</TableHead>
                        <TableHead>Tên nhân viên</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Giờ vào</TableHead>
                        <TableHead>Giờ ra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                          <TableCell className="font-mono">{row.employee_code}</TableCell>
                          <TableCell className="font-mono">{normalizeToNV(row.employee_code)}</TableCell>
                          <TableCell>{row.employee_name}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.check_in}</TableCell>
                          <TableCell>{row.check_out}</TableCell>
                    </TableRow>
                      ))}
                      {parsedRows.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            ... và {parsedRows.length - 10} bản ghi khác
                          </TableCell>
                        </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="space-y-4">
                <h4 className="font-medium">Kết quả Import:</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                    <div className="text-sm text-green-800">Thành công</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-red-800">Thất bại</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.warnings.length}</div>
                    <div className="text-sm text-yellow-800">Cảnh báo</div>
                  </div>
                </div>

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Lỗi ({importResult.errors.length})
                    </h4>
                    <ScrollArea className="h-32 border rounded-lg">
                      <div className="p-3 space-y-2">
                        {importResult.errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertDescription className="text-sm">
                              <strong>Dòng {error.row} - {error.employee_code}:</strong> {error.error}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Warnings */}
                {importResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Cảnh báo ({importResult.warnings.length})
                    </h4>
                    <ScrollArea className="h-32 border rounded-lg">
                      <div className="p-3 space-y-2">
                        {importResult.warnings.map((warning, index) => (
                          <Alert key={index}>
                            <AlertDescription className="text-sm">
                              <strong>Dòng {warning.row} - {warning.employee_code}:</strong> {warning.message}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-4">
              <h4 className="font-medium">Hướng dẫn sử dụng:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Mã nhân viên:</strong> File CSV sử dụng format 5 chữ số (00001, 00002...), hệ thống sẽ tự động chuyển đổi thành NV00001, NV00002...</li>
                <li><strong>Tính toán công:</strong> Hệ thống sẽ tính toán số công dựa trên giờ vào/ra thực tế</li>
                <li><strong>Logic tính công:</strong> ≥6h = 1 công, 3-6h = 0.5 công, &lt;3h = 0 công</li>
                <li><strong>Cuối tuần:</strong> Làm việc cuối tuần sẽ được tính là tăng ca</li>
                <li>File phải có định dạng CSV với encoding UTF-8</li>
                <li>Mã nhân viên phải tồn tại trong hệ thống</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function normalizeToNV(rawCode: string): string {
  const numeric = (rawCode || '').replace(/\D/g, '')
  if (!numeric) return rawCode
  return `NV${numeric.padStart(5, '0')}`
}

function parseMitaproDetailCSV(csvContent: string): ParsedRow[] {
  const lines = csvContent.split('\n')
  const records: ParsedRow[] = []

  let currentEmployeeCode: string | null = null
  let currentEmployeeName: string | null = null
  let inDetailTable = false
  let sawAnyHeaderForThisEmployee = false

  const stripCommas = (s: string) => s.replace(/,+$/g, '')
  const stripDiacritics = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line) continue
    const ascii = stripDiacritics(line).toLowerCase()

    // Employee header: robust detection even with mojibake
    // Heuristics:
    // 1) contains ": <5 digits>" and any of nhan/vien/ma tokens (ascii)
    // 2) OR contains a 5-digit token and at least 2 colons on the line (e.g., "Mã..., Tên..., Phòng ban:")
    const colonCount = (line.match(/:/g) || []).length
    if ((/:\s*\d{5}/.test(line) && (ascii.includes('nhan') || ascii.includes('vien') || ascii.includes('ma'))) || (/\d{5}/.test(line) && colonCount >= 2)) {
      const codeMatch = line.match(/:\s*(\d{5})/) || line.match(/(\d{5})/) || ascii.match(/(\d{5})/)
      // try to extract name from the original line to preserve accents
      const nameMatch = stripCommas(line).match(/t[eê]n\s*nh[aâ]n\s*vi[eê]n\s*:\s*([^,]+)/i) || stripCommas(stripDiacritics(line)).match(/ten\s*nhan\s*vien\s*:\s*([^,]+)/i)
      currentEmployeeCode = codeMatch ? codeMatch[1] : null
      currentEmployeeName = nameMatch ? nameMatch[1].trim() : null
      inDetailTable = false
      sawAnyHeaderForThisEmployee = false
      continue
    }

    if (ascii.startsWith('ngay,th') || (ascii.startsWith('ngay') && ascii.includes(',th'))) {
      inDetailTable = true
      if (i + 1 < lines.length) {
      const nextAscii = stripDiacritics(lines[i + 1].trim()).toLowerCase()
        if ((/v[àa]o|vao/.test(lines[i + 1])) || (nextAscii.includes('vao') && nextAscii.includes('ra'))) {
        i += 1
        }
      }
      sawAnyHeaderForThisEmployee = true
      continue
    }

    if ((inDetailTable || (!sawAnyHeaderForThisEmployee && currentEmployeeCode)) && currentEmployeeCode) {
      const parts = line.split(',').map(p => p.replace(/\r/g, ''))
      if (parts.length < 4) continue
      const dateStr = parts[0]?.trim()
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        if (ascii.includes('bang chi tiet') || (/\d{5}/.test(ascii) && ascii.includes('ma nhan vien'))) {
          inDetailTable = false
        }
        continue
      }

      // read even if only one of in/out exists; normalize '-' to empty
      const rawIn = (parts[2] || '').trim()
      const rawOut = (parts[3] || '').trim()
      const checkIn = rawIn === '-' ? '' : rawIn
      const checkOut = rawOut === '-' ? '' : rawOut
      if ((checkIn && checkIn.length > 0) || (checkOut && checkOut.length > 0)) {
        records.push({
          employee_code: currentEmployeeCode,
          employee_name: currentEmployeeName || '',
          date: dateStr,
          check_in: checkIn,
          check_out: checkOut
        })
      }
    }

    // Fallback: if we encounter a date row without having detected headers for this employee, try to infer employee code from recent lines
    const dateStart = line.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s*,/)
    if (dateStart && !currentEmployeeCode) {
      // look back up to 8 lines for a 5-digit code
      for (let j = Math.max(0, i - 8); j < i; j++) {
        const back = lines[j].trim()
        const backAscii = stripDiacritics(back).toLowerCase()
        const codeMatch = back.match(/(\d{5})/) || backAscii.match(/(\d{5})/)
        if (codeMatch) {
          currentEmployeeCode = codeMatch[1]
          // try grab name if present
          const nameMatch = back.match(/t[eê]n\s*nh[aâ]n\s*vi[eê]n\s*:\s*([^,]+)/i) || stripDiacritics(back).match(/ten\s*nhan\s*vien\s*:\s*([^,]+)/i)
          currentEmployeeName = nameMatch ? nameMatch[1].trim() : ''
          inDetailTable = true
          break
        }
      }
      // reprocess this line with the now-set employee code by decrementing i
      if (currentEmployeeCode) {
        i -= 1
        continue
      }
    }
  }

  return records
}
