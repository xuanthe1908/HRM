import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/employee/attendance - Lấy attendance records của nhân viên hiện tại
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);

    // Get employee info from auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, employee_code')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query for attendance records
    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        employee:employees!attendance_records_employee_id_fkey (
          id,
          name,
          employee_code,
          email
        )
      `)
      .eq('employee_id', employeeData.id)
      .order('date', { ascending: false });

    // Add filters if provided
    if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    if (month && year) {
      const monthNum = parseInt(month);
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
      const nextYear = monthNum === 12 ? parseInt(year) + 1 : year;
      query = query
        .gte('date', `${year}-${monthNum.toString().padStart(2, '0')}-01`)
        .lt('date', `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: attendanceRecords, error: attendanceError } = await query;

    if (attendanceError) {
      throw attendanceError;
    }

    // Group records by month and calculate statistics
    const monthlyStats = groupAttendanceByMonth(attendanceRecords || []);

    return NextResponse.json(monthlyStats);

  } catch (error) {
    console.error('Employee attendance API error:', error);
    return handleError(error);
  }
}

// Helper function to group attendance records by month and calculate stats
function groupAttendanceByMonth(records: any[]) {
  const monthlyData: { [key: string]: any } = {};

  records.forEach(record => {
    const date = new Date(record.date);
    const monthKey = `${getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        id: `${date.getFullYear()}-${date.getMonth() + 1}`,
        month: monthKey,
        year: date.getFullYear(),
        monthNumber: date.getMonth() + 1,
        presentDays: 0,
        leaveDays: 0,
        lateDays: 0,
        absentDays: 0,
        overtimeHours: 0,
        records: []
      };
    }

    monthlyData[monthKey].records.push(record);
    
    // Count attendance by status (regardless of weekday/weekend)
    switch (record.status) {
      case 'present':
      case 'present_full':
        monthlyData[monthKey].presentDays++;
        break;
      case 'late':
      case 'late_full':
        monthlyData[monthKey].presentDays++;
        monthlyData[monthKey].lateDays++;
        break;
      case 'absent':
      case 'absent_full':
        monthlyData[monthKey].absentDays++;
        break;
      case 'leave':
      case 'leave_full':
      case 'half_day':
        monthlyData[monthKey].leaveDays++;
        break;
    }
    
    // Add overtime hours
    if (record.overtime_hours) {
      monthlyData[monthKey].overtimeHours += record.overtime_hours;
    }
  });

  // Calculate working days and attendance rate for each month
  const result = Object.values(monthlyData).map((month: any) => {
    // Calculate actual working days in the month (weekdays only)
    const workingDays = calculateWorkingDaysInMonth(month.year, month.monthNumber);
    
    const attendanceRate = workingDays > 0 
      ? ((month.presentDays / workingDays) * 100)
      : 0;
    
    // Find most common leave type for the month
    const leaveRecords = month.records.filter((r: any) => r.status === 'leave');
    const leaveType = leaveRecords.length > 0 
      ? getLeaveType(leaveRecords[0]) 
      : '-';

    return {
      id: month.id,
      month: month.month,
      year: month.year,
      monthNumber: month.monthNumber,
      workingDays: workingDays,
      presentDays: month.presentDays,
      leaveDays: month.leaveDays,
      lateDays: month.lateDays,
      absentDays: month.absentDays,
      overtimeHours: Math.round(month.overtimeHours * 10) / 10,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      leaveType,
      records: month.records
    };
  });

  // Sort by year and month (newest first)
  return result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.monthNumber - a.monthNumber;
  });
}

// Helper function to calculate working days in a month (weekdays only)
function calculateWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // Count weekdays only (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

// Helper function to get month name in Vietnamese
function getMonthName(monthNumber: number): string {
  const months = [
    '', // 0 index not used
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  return months[monthNumber] || `Month ${monthNumber}`;
}

// Helper function to determine leave type
function getLeaveType(record: any): string {
  // Map status or notes to leave type
  if (record.notes) {
    if (record.notes.toLowerCase().includes('sick')) return 'Sick Leave';
    if (record.notes.toLowerCase().includes('annual')) return 'Annual Leave';
    if (record.notes.toLowerCase().includes('personal')) return 'Personal Leave';
    if (record.notes.toLowerCase().includes('maternity')) return 'Maternity Leave';
    if (record.notes.toLowerCase().includes('emergency')) return 'Emergency Leave';
  }
  return 'Leave';
} 