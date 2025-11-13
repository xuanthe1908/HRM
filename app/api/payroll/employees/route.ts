import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '0', 10)
    const year = parseInt(searchParams.get('year') || '0', 10)

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    // 1. Get all active employees with detailed information for tax calculation
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, name, base_salary, department_id, position_id, 
        meal_allowance, transport_allowance, phone_allowance, attendance_allowance,
        children_count, marital_status, personal_deduction,
        gender, birth_date, id_number, social_insurance_number, tax_code
      `)
      .eq('status', 'active')
      .order('name');

    if (employeesError) throw employeesError;
    if (!employees) return NextResponse.json([]);
    
    // 2. Get all departments and positions
    const { data: departments, error: deptsError } = await supabaseAdmin.from('departments').select('id, name');
    const { data: positions, error: posError } = await supabaseAdmin.from('positions').select('id, name');
    if (deptsError) throw deptsError;
    if (posError) throw posError;

    const departmentMap = new Map(departments.map(d => [d.id, d.name]));
    const positionMap = new Map(positions.map(p => [p.id, p.name]));

    // 3. Get all relevant data for the period in parallel
    // Tính date range chính xác cho tháng
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    const [
      { data: attendanceRecords, error: attendanceError },
      { data: dependents, error: dependentsError },
      { data: allowances, error: allowancesError },
      { data: salaryRegulations, error: regulationsError }
    ] = await Promise.all([
      supabaseAdmin.from('attendance_records').select('employee_id, status, overtime_hours, date, work_value').gte('date', startDate).lte('date', endDate),
      supabaseAdmin.from('employee_dependents').select('employee_id, id').eq('is_active', true),
      supabaseAdmin.from('salary_allowances').select('*').lte('effective_date', endDate),
      supabaseAdmin.from('salary_regulations').select('working_days_per_month, working_hours_per_day, max_hours_per_day').order('created_at', { ascending: false }).limit(1)
    ]);
    
    if (attendanceError) throw attendanceError;
    if (dependentsError) throw dependentsError;
    if (allowancesError) throw allowancesError;
    // Không throw error cho regulations vì có thể bảng chưa có dữ liệu

    // 4. Process data in-memory for efficient mapping
    const dependentsCountMap = new Map<string, number>();
    dependents?.forEach(d => {
      dependentsCountMap.set(d.employee_id, (dependentsCountMap.get(d.employee_id) || 0) + 1);
    });

    const latestAllowancesMap = new Map<string, any>();
    allowances?.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
      .forEach(a => {
        if (!latestAllowancesMap.has(a.employee_id)) {
          latestAllowancesMap.set(a.employee_id, a);
        }
      });
      
    // Lấy cài đặt từ salary_regulations
    const workingDaysPerMonth = salaryRegulations?.[0]?.working_days_per_month || 22;
    const workingHoursPerDay = salaryRegulations?.[0]?.working_hours_per_day || 8;
    const maxHoursPerDay = salaryRegulations?.[0]?.max_hours_per_day || 8;

    // 5. Map all data to the final employee object
    const processedEmployees = employees.map(employee => {
      const employeeAttendance = attendanceRecords?.filter(r => r.employee_id === employee.id) || [];
      
      let presentDays = 0;
      let overtimeHours = 0;
      let weekendOvertimeHours = 0;
      let weekdayOvertimeHours = 0;
      
      employeeAttendance.forEach(record => {
        // Cộng work_value cho các status KHÔNG PHẢI weekend_overtime
        if (record.work_value > 0 && record.status !== 'weekend_overtime') {
          presentDays += record.work_value;
        }
        
        // Tính overtime theo ngày trong tuần
        const recordDate = new Date(record.date);
        const dayOfWeek = recordDate.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Tính overtime khác nhau cho ngày thường và cuối tuần
        let actualOvertimeHours = 0;
        
        if (isWeekend) {
          // Cuối tuần: tất cả giờ làm việc đều là overtime (nếu có status present)
          if (['present_full', 'meeting_full'].includes(record.status)) {
            // Với ngày cuối tuần, tất cả giờ làm việc đều là overtime
            actualOvertimeHours = record.overtime_hours || 0;
          }
        } else {
          // Ngày thường: chỉ tính overtime vượt quá giờ chuẩn
          const totalWorkHours = workingHoursPerDay + (record.overtime_hours || 0);
          const actualTotalHours = Math.min(totalWorkHours, maxHoursPerDay);
          actualOvertimeHours = Math.max(0, actualTotalHours - workingHoursPerDay);
        }
        
        overtimeHours += actualOvertimeHours;
        
        if (isWeekend) {
          weekendOvertimeHours += actualOvertimeHours;
        } else {
          weekdayOvertimeHours += actualOvertimeHours;
        }
      });

      const employeeAllowances = latestAllowancesMap.get(employee.id);

      return {
        id: employee.id,
        name: employee.name,
        department: departmentMap.get(employee.department_id) || 'N/A',
        position: positionMap.get(employee.position_id) || 'N/A',
        basicSalary: employee.base_salary || 0,
        presentDays: presentDays,
        workingDays: workingDaysPerMonth,
        overtimeHours: overtimeHours,
        weekdayOvertimeHours: weekdayOvertimeHours,
        weekendOvertimeHours: weekendOvertimeHours,
        dependents: dependentsCountMap.get(employee.id) || 0,
        // Thêm các phụ cấp từ thông tin nhân viên
        meal_allowance: employee.meal_allowance || 0,
        transport_allowance: employee.transport_allowance || 0,
        phone_allowance: employee.phone_allowance || 0,
        attendance_allowance: employee.attendance_allowance || 0,
        // Thông tin chi tiết cho tính thuế
        children_count: employee.children_count || 0,
        marital_status: employee.marital_status || '',
        personal_deduction: employee.personal_deduction || 0,
        gender: employee.gender || '',
        birth_date: employee.birth_date || '',
        id_number: employee.id_number || '',
        social_insurance_number: employee.social_insurance_number || '',
        tax_code: employee.tax_code || '',
        allowances: {
          housing: employeeAllowances?.housing_allowance || 0,
          transport: employeeAllowances?.transport_allowance || 0,
          meal: employeeAllowances?.meal_allowance || 0,
          phone: employeeAllowances?.phone_allowance || 0,
          position: employeeAllowances?.position_allowance || 0,
          other: employeeAllowances?.other_allowances || 0,
        },
        bonuses: {
          performance: 0, sales: 0, holiday: 0, birthday: 0, 
          project: 0, special: 0, referral: 0, seniority: 0,
        },
      };
    });

    return NextResponse.json(processedEmployees);

  } catch (error) {
    console.error('💥 Error fetching employees for payroll:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const employee_id = searchParams.get('employee_id')
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const updateData = await request.json()

  if (!employee_id || !month || !year) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('payroll_records')
    .update(updateData)
    .eq('employee_id', employee_id)
    .eq('month', month)
    .eq('year', year)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
} 