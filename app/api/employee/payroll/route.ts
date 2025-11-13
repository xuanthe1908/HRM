import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/employee/payroll - Lấy payroll history của nhân viên hiện tại
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

    // Build query for payroll records
    let query = supabaseAdmin
      .from('payroll_records')
      .select(`
        *,
        employee:employees!payroll_records_employee_id_fkey (
          id,
          name,
          employee_code,
          email
        )
      `)
      .eq('employee_id', employeeData.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    // Add filters if provided
    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (month) {
      query = query.eq('month', parseInt(month));
    }

    const { data: payrollRecords, error: payrollError } = await query;

    if (payrollError) {
      throw payrollError;
    }

    // Transform data to match expected format
    const transformedData = await Promise.all(payrollRecords?.map(async record => {
      // Calculate detailed overtime from attendance records
      const { weekdayOvertimeHours, weekendOvertimeHours, weekdayOvertimePay, weekendOvertimePay } = 
        await calculateOvertimeDetails(employeeData.id, record.year, record.month);

      return {
      id: record.id,
      month: `${getMonthName(record.month)} ${record.year}`,
      payDate: record.payment_date || `${record.year}-${record.month.toString().padStart(2, '0')}-28`,
      status: record.status || 'Paid',
      
      // Basic salary and attendance
      basicSalary: record.base_salary || 0,
      workingDays: record.working_days || 0,
      presentDays: record.actual_working_days || 0,
      attendanceRate: record.working_days > 0 ? Math.round((record.actual_working_days / record.working_days) * 100) : 0,
      actualBasicSalary: record.actual_base_salary || 0,

      // Allowances
      allowances: {
        housing: record.housing_allowance || 0,
        transport: record.transport_allowance || 0,
        phone: record.phone_allowance || 0,
        meal: record.meal_allowance || 0,
        attendance: record.attendance_allowance || 0,
        position: record.position_allowance || 0,
        other: record.other_allowances || 0,
      },

      // Overtime (chi tiết cả weekday và weekend)
      overtimeHours: record.overtime_hours || 0,
      overtimeRate: record.overtime_rate || 150,
      overtimePay: record.overtime_pay || 0,
      
      // Overtime breakdown (calculated from attendance records)
      weekdayOvertimeHours: weekdayOvertimeHours,
      weekendOvertimeHours: weekendOvertimeHours,
      weekdayOvertimePay: weekdayOvertimePay,
      weekendOvertimePay: weekendOvertimePay,

      // Insurance (Employee portion)
      insuranceBase: record.base_salary || 0,
      employeeInsurance: {
        social: record.social_insurance_employee || 0,
        health: record.health_insurance_employee || 0,
        unemployment: record.unemployment_insurance_employee || 0,
        union: record.union_fee_employee || 0,
      },

      // Insurance (Company portion)
      companyInsurance: {
        social: record.social_insurance_company || 0,
        health: record.health_insurance_company || 0,
        unemployment: record.unemployment_insurance_company || 0,
        union: 0,
      },

      // Tax calculation với logic mới
      taxCalculation: {
        grossIncome: record.gross_income || 0, // Sử dụng gross_income thay vì total_income
        incomeAfterInsurance: (record.gross_income || 0) - (record.social_insurance_employee || 0) - (record.health_insurance_employee || 0) - (record.unemployment_insurance_employee || 0),
        incomeForTax: ((record.gross_income || 0) - (record.social_insurance_employee || 0) - (record.health_insurance_employee || 0) - (record.unemployment_insurance_employee || 0)) - (record.meal_allowance || 0),
        actualMealAllowance: record.meal_allowance || 0,
        personalDeduction: 11000000, // Standard personal deduction
        dependentDeduction: record.dependent_deductions || 0,
        taxableIncome: record.taxable_income || 0,
        incomeTax: record.income_tax || 0,
      },

      totalDeductions: record.total_deductions || 0,
      netSalary: record.net_salary || 0,
      dependents: record.dependents || 0,
      taxCode: record.tax_code || '',
      };
    }) || []);

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('Employee payroll API error:', error);
    return handleError(error);
  }
}

// Helper function to calculate overtime details from attendance records
async function calculateOvertimeDetails(employeeId: string, year: number, month: number) {
  try {
    // Get attendance records for the specified month/year
    const { data: attendanceRecords, error } = await supabaseAdmin
      .from('attendance_records')
      .select('status, work_value, overtime_hours, day_of_week')
      .eq('employee_id', employeeId)
      .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
      .lt('date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

    if (error || !attendanceRecords) {
      return { weekdayOvertimeHours: 0, weekendOvertimeHours: 0, weekdayOvertimePay: 0, weekendOvertimePay: 0 };
    }

    // Get salary regulations for overtime rates
    const { data: regulations } = await supabaseAdmin
      .from('salary_regulations')
      .select('overtime_weekday_rate, overtime_weekend_rate')
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    const overtimeWeekdayRate = regulations?.overtime_weekday_rate || 150;
    const overtimeWeekendRate = regulations?.overtime_weekend_rate || 200;

    // Get employee's basic salary for rate calculation
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('basic_salary')
      .eq('id', employeeId)
      .single();

    const basicSalary = employee?.basic_salary || 0;
    const workingDaysPerMonth = 22; // Standard working days
    const standardDailyRate = basicSalary / workingDaysPerMonth;

    let weekdayOvertimeHours = 0;
    let weekendOvertimeHours = 0;

    // Calculate overtime hours by type
    attendanceRecords.forEach(record => {
      if (record.status === 'overtime') {
        weekdayOvertimeHours += record.overtime_hours || 0;
      } else if (record.status === 'weekend_overtime') {
        weekendOvertimeHours += record.overtime_hours || 0;
      }
    });

    // Calculate overtime pay
    const weekdayOvertimePay = (weekdayOvertimeHours / 8) * standardDailyRate * (overtimeWeekdayRate / 100);
    const weekendOvertimePay = (weekendOvertimeHours / 8) * standardDailyRate * (overtimeWeekendRate / 100);

    return {
      weekdayOvertimeHours,
      weekendOvertimeHours,
      weekdayOvertimePay,
      weekendOvertimePay
    };

  } catch (error) {
    console.error('Error calculating overtime details:', error);
    return { weekdayOvertimeHours: 0, weekendOvertimeHours: 0, weekdayOvertimePay: 0, weekendOvertimePay: 0 };
  }
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