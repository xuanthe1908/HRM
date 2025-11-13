import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Get the latest salary regulation
    const { data: regulations, error } = await supabaseAdmin
      .from('salary_regulations')
      .select('*')
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching salary regulations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no regulations found, return default values
    if (!regulations) {
      // Trả về giá trị mặc định với camelCase
      return NextResponse.json({
        basicSalary: 2340000,
        probationSalaryRate: 85,
        maxInsuranceSalary: 46800000,
        maxUnemploymentSalary: 46800000,
        workingDaysPerMonth: 22,
        workingHoursPerDay: 8,
        maxHoursPerDay: 8,
        overtimeWeekdayRate: 150,
        overtimeWeekendRate: 200,
        overtimeHolidayRate: 300,
        overtimeNightRate: 130,
        companySocialInsuranceRate: 17.5,
        companyHealthInsuranceRate: 3.0,
        companyUnemploymentInsuranceRate: 1.0,
        companyUnionFeeRate: 0.0,
        employeeSocialInsuranceRate: 8.0,
        employeeHealthInsuranceRate: 1.5,
        employeeUnemploymentInsuranceRate: 1.0,
        employeeUnionFeeRate: 0.0,
        personalDeduction: 11000000,
        dependentDeduction: 4400000,
        nonResidentTaxRate: 20.0,
        enableProgressiveTax: true,
        effectiveDate: new Date().toISOString().split('T')[0]
      })
    }

    // Chuyển đổi dữ liệu từ snake_case sang camelCase
    const camelCaseRegulations = {
      id: regulations.id,
      basicSalary: regulations.basic_salary,
      probationSalaryRate: regulations.probation_salary_rate,
      maxInsuranceSalary: regulations.max_insurance_salary,
      maxUnemploymentSalary: regulations.max_unemployment_salary,
      workingDaysPerMonth: regulations.working_days_per_month,
      workingHoursPerDay: regulations.working_hours_per_day,
      maxHoursPerDay: regulations.max_hours_per_day,
      overtimeWeekdayRate: regulations.overtime_weekday_rate,
      overtimeWeekendRate: regulations.overtime_weekend_rate,
      overtimeHolidayRate: regulations.overtime_holiday_rate,
      overtimeNightRate: regulations.overtime_night_rate,
      companySocialInsuranceRate: regulations.company_social_insurance_rate,
      companyHealthInsuranceRate: regulations.company_health_insurance_rate,
      companyUnemploymentInsuranceRate: regulations.company_unemployment_insurance_rate,
      companyUnionFeeRate: regulations.company_union_fee_rate,
      employeeSocialInsuranceRate: regulations.employee_social_insurance_rate,
      employeeHealthInsuranceRate: regulations.employee_health_insurance_rate,
      employeeUnemploymentInsuranceRate: regulations.employee_unemployment_insurance_rate,
      employeeUnionFeeRate: regulations.employee_union_fee_rate,
      personalDeduction: regulations.personal_deduction,
      dependentDeduction: regulations.dependent_deduction,
      nonResidentTaxRate: regulations.non_resident_tax_rate,
      enableProgressiveTax: regulations.enable_progressive_tax,
      effectiveDate: regulations.effective_date,
      createdBy: regulations.created_by,
      createdAt: regulations.created_at,
      updatedAt: regulations.updated_at
    };

    return NextResponse.json(camelCaseRegulations)
  } catch (error) {
    console.error('Error in salary regulations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the incoming data (basic validation)
    if (!body || !body.effectiveDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert camelCase from client to snake_case for database
    const newRegulationData = {
      basic_salary: body.basicSalary,
      probation_salary_rate: body.probationSalaryRate,
      max_insurance_salary: body.maxInsuranceSalary,
      max_unemployment_salary: body.maxUnemploymentSalary,
      working_days_per_month: body.workingDaysPerMonth,
      working_hours_per_day: body.workingHoursPerDay,
      max_hours_per_day: body.maxHoursPerDay,
      overtime_weekday_rate: body.overtimeWeekdayRate,
      overtime_weekend_rate: body.overtimeWeekendRate,
      overtime_holiday_rate: body.overtimeHolidayRate,
      overtime_night_rate: body.overtimeNightRate,
      company_social_insurance_rate: body.companySocialInsuranceRate,
      company_health_insurance_rate: body.companyHealthInsuranceRate,
      company_unemployment_insurance_rate: body.companyUnemploymentInsuranceRate,
      company_union_fee_rate: body.companyUnionFeeRate,
      employee_social_insurance_rate: body.employeeSocialInsuranceRate,
      employee_health_insurance_rate: body.employeeHealthInsuranceRate,
      employee_unemployment_insurance_rate: body.employeeUnemploymentInsuranceRate,
      employee_union_fee_rate: body.employeeUnionFeeRate,
      personal_deduction: body.personalDeduction,
      dependent_deduction: body.dependentDeduction,
      non_resident_tax_rate: body.nonResidentTaxRate,
      enable_progressive_tax: body.enableProgressiveTax,
      effective_date: body.effectiveDate,
      // created_by: userId, // Optional: if you want to track who creates it
    };

    const { data, error } = await supabaseAdmin
      .from('salary_regulations')
      .insert(newRegulationData)
      .select();

    if (error) {
      console.error('Error creating salary regulation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST salary regulations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}