import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/attendance/employee/[id] - Lấy dữ liệu chấm công của nhân viên theo tháng
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    if (!month || !year) {
      return NextResponse.json(
        { error: 'Thiếu tham số month hoặc year' },
        { status: 400 }
      );
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('employee_id', params.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Lỗi khi lấy dữ liệu chấm công' },
        { status: 500 }
      );
    }

    // Tính toán dữ liệu chấm công
    let totalPresentDays = 0;
    let totalOvertimeHours = 0;
    let weekdayOvertimeHours = 0;
    let weekendOvertimeHours = 0;

    data?.forEach(record => {
      const date = new Date(record.date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      // Cộng work_value cho các status KHÔNG PHẢI weekend_overtime
      if (record.work_value > 0 && record.status !== 'weekend_overtime') {
        totalPresentDays += record.work_value;
        console.log(`🔍 Record: date=${record.date}, status=${record.status}, work_value=${record.work_value}, totalPresentDays=${totalPresentDays}`);
      }
      
      if (record.overtime_hours > 0) {
        totalOvertimeHours += record.overtime_hours;
        if (isWeekend) {
          weekendOvertimeHours += record.overtime_hours;
        } else {
          weekdayOvertimeHours += record.overtime_hours;
        }
      }
    });

    // Tính ngày làm thêm từ giờ
    const workingHoursPerDay = 8;
    const weekdayOvertimeDays = workingHoursPerDay > 0 ? weekdayOvertimeHours / workingHoursPerDay : 0;
    const weekendOvertimeDays = workingHoursPerDay > 0 ? weekendOvertimeHours / workingHoursPerDay : 0;
    const totalOvertimeDays = weekdayOvertimeDays + weekendOvertimeDays;
    const standardPresentDays = Math.max(0, totalPresentDays - totalOvertimeDays);

    return NextResponse.json({
      attendanceRecords: data,
      summary: {
        totalPresentDays,
        totalOvertimeHours,
        weekdayOvertimeHours,
        weekendOvertimeHours,
        weekdayOvertimeDays,
        weekendOvertimeDays,
        totalOvertimeDays,
        standardPresentDays
      }
    });

  } catch (error) {
    return handleError(error);
  }
} 