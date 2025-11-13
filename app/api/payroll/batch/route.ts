// app/api/payroll/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

// Main function to handle the POST request for generating payroll batch
export async function POST(request: NextRequest) {
  try {
    // Bypass authentication cho việc test
    // const userId = await authenticate(request);
    const requestBody = await request.json();

    // Check if this is a batch save request (has records) or payroll calculation request (has month/year)
    if (requestBody.records && Array.isArray(requestBody.records)) {
      // This is a batch save request
      const overwrite = requestBody.overwrite || false;
      return await handleBatchSave(requestBody.records, overwrite);
    }

    // This is a payroll calculation request
    const { month, year } = requestBody;
    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    return await handlePayrollCalculation(month, year);
  } catch (error) {
    console.error('Error in payroll batch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to handle batch save of payroll records
async function handleBatchSave(records: any[], overwrite: boolean = false) {
  try {
    if (overwrite) {
      // User confirmed overwrite, use upsert
      const { data, error } = await supabaseAdmin
        .from('payroll_records')
        .upsert(records, {
          onConflict: 'employee_id,month,year',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        throw error;
      }

      // --- Trigger notification after successful save ---
      const employeeIds = records.map(record => record.employee_id);
      const month = records[0]?.month;
      const year = records[0]?.year;

      if (employeeIds.length > 0 && month && year) {
        // We don't need to await this, it can run in the background
        NotificationService.notifyPayrollGenerated(employeeIds, month, year, undefined);
      }

      return NextResponse.json({ 
        success: true, 
        data,
        message: `Successfully updated ${records.length} payroll records` 
      });
    } else {
      // First try insert to check for duplicates
    const { data, error } = await supabaseAdmin
      .from('payroll_records')
        .insert(records)
        .select();

    if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          return NextResponse.json({ 
            error: 'duplicate key violation: Some employees already have payroll records for this period. Do you want to overwrite them?' 
          }, { status: 409 });
        }
        throw error;
      }

      // --- Trigger notification after successful save ---
      const employeeIds = records.map(record => record.employee_id);
      const month = records[0]?.month;
      const year = records[0]?.year;

      if (employeeIds.length > 0 && month && year) {
        // We don't need to await this, it can run in the background
        NotificationService.notifyPayrollGenerated(employeeIds, month, year, undefined);
      }

      return NextResponse.json({ 
        success: true, 
        data,
        message: `Successfully created ${records.length} payroll records` 
      });
    }
  } catch (error) {
    console.error('Error saving payroll batch:', error);
    return NextResponse.json({ error: 'Failed to save payroll records' }, { status: 500 });
  }
}

// Function to handle payroll calculation
async function handlePayrollCalculation(month: number, year: number) {
  try {
    // --- 1. Fetch necessary data ---
    // Fetch the latest salary regulation effective for the given payroll period
    const { data: regulation, error: regulationError } = await supabaseAdmin
      .from('salary_regulations')
      .select('*')
      .lte('effective_date', `${year}-${month}-01`)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (regulationError || !regulation) {
      throw new Error(`Could not fetch salary regulations for ${month}/${year}. Please ensure at least one regulation is set.`);
    }
    const { working_days_per_month, overtime_weekend_rate, overtime_weekday_rate } = regulation;

    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, base_salary,
        position_id,
        housing_allowance,
        transport_allowance,
        meal_allowance,
        phone_allowance,
        position_allowance,
        attendance_allowance,
        other_allowances,
        positions(name)
      `);
      
    if (employeesError || !employees) {
      throw new Error('Could not fetch employees.');
    }

    const payrollRecords = [];

    // --- 2. Process each employee ---
    for (const employee of employees) {
      const { data: attendanceData, error: attendanceError } = await supabaseAdmin
        .from('attendance_records')
        .select('status, work_value')
        .eq('employee_id', employee.id)
        .eq('month', month)
        .eq('year', year);

      if (attendanceError) {
        console.error(`Could not fetch attendance for employee ${employee.id}`, attendanceError);
        continue; // Skip to next employee
      }

      // --- 3. Apply new calculation logic ---
      const position = employee.positions?.[0]?.name || '';
      const isIntern = position.toLowerCase().includes('intern');
      const isProbation = position.toLowerCase().includes('thử việc');
      
      const salaryPerDay = employee.base_salary / working_days_per_month;

      // Calculate standard work days (KHÔNG bao gồm weekend_overtime)
      const standardWorkStatuses = ['present_full', 'present_half', 'paid_leave'];
      const actual_working_days = attendanceData
        .filter(att => standardWorkStatuses.includes(att.status))
        .reduce((sum, att) => sum + (att.work_value || 0), 0);
      
      // Apply probation salary reduction (85% for probation employees)
      const salaryMultiplier = isProbation ? 0.85 : 1;
      const actual_base_salary = salaryPerDay * actual_working_days * salaryMultiplier;

      // Calculate weekday overtime pay  
      const weekday_overtime_days = attendanceData
        .filter(att => att.status === 'overtime')
        .reduce((sum, att) => sum + (att.work_value || 0), 0);
      
      // Calculate weekend overtime pay
      const weekend_overtime_days = attendanceData
        .filter(att => att.status === 'weekend_overtime')
        .reduce((sum, att) => sum + (att.work_value || 0), 0);
      
      // Overtime rates from salary_regulations
      const weekday_overtime_pay = salaryPerDay * salaryMultiplier * weekday_overtime_days * (overtime_weekday_rate / 100);
      const weekend_overtime_pay = salaryPerDay * salaryMultiplier * weekend_overtime_days * (overtime_weekend_rate / 100);
      const total_overtime_pay = weekday_overtime_pay + weekend_overtime_pay;
      
      // Calculate total allowances from employee data
      const total_allowances = (employee.housing_allowance || 0) + (employee.transport_allowance || 0) + (employee.meal_allowance || 0) + (employee.phone_allowance || 0) + (employee.position_allowance || 0) + (employee.attendance_allowance || 0) + (employee.other_allowances || 0);
      
      // Total gross income = base salary + allowances + overtime pay
      const gross_income = actual_base_salary + total_allowances + total_overtime_pay;
      const net_salary = gross_income; // Placeholder for further deductions

      // Calculate total overtime
      const total_overtime_days = weekday_overtime_days + weekend_overtime_days; // Số công làm thêm
      const total_overtime_hours = total_overtime_days * 8; // Số giờ làm thêm (để tương thích với DB)

      payrollRecords.push({
        employee_id: employee.id,
          month,
          year,
        base_salary: employee.base_salary,
        working_days: working_days_per_month,
        actual_working_days: actual_working_days,
        actual_base_salary: actual_base_salary,
        overtime_pay: total_overtime_pay, // Total của cả weekday và weekend
        gross_income,
        net_salary,
        status: 'pending',
        // Overtime information
        overtime_hours: total_overtime_hours, // Tổng giờ làm thêm (= total_overtime_days * 8)
        overtime_rate: weekend_overtime_days > 0 ? overtime_weekend_rate : overtime_weekday_rate, // Rate cao nhất được áp dụng
        personal_deduction: regulation.personal_deduction,
        dependent_deduction: regulation.dependent_deduction,
        // Allowances (cần lấy từ employee data)
        housing_allowance: employee.housing_allowance || 0,
        transport_allowance: employee.transport_allowance || 0,
        meal_allowance: employee.meal_allowance || 0,
        phone_allowance: employee.phone_allowance || 0,
        position_allowance: employee.position_allowance || 0,
        attendance_allowance: employee.attendance_allowance || 0,
        other_allowances: employee.other_allowances || 0,
        total_allowances: total_allowances,
        // Insurance (simplified - can be enhanced later)
        social_insurance_employee: 0,
        health_insurance_employee: 0,
        unemployment_insurance_employee: 0,
        union_fee_employee: 0,
        social_insurance_company: 0,
        health_insurance_company: 0,
        unemployment_insurance_company: 0,
        union_fee_company: 0,
        income_after_insurance: gross_income, // Simplified for now
        number_of_dependents: 0,
        taxable_income: Math.max(0, gross_income - regulation.personal_deduction),
        income_tax: 0,
        total_deductions: 0,
      });
    }

    // --- 4. Insert records into the database ---
    if (payrollRecords.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('payroll_records')
        .upsert(payrollRecords, { onConflict: 'employee_id, month, year' })
        .select();

      if (error) {
        throw new Error(`Error saving payroll records: ${error.message}`);
      }
      
      // Send notifications
      // ... (notification logic remains the same)

      return NextResponse.json({
        message: 'Payroll records calculated and created successfully',
        records: data,
        count: data?.length || 0,
      });
    }

    return NextResponse.json({ message: 'No employees to process payroll for.', count: 0 });

  } catch (error) {
    console.error('Error in payroll calculation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 