import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);

    console.log('Authenticated userId:', userId);
    
    // Find employee by auth_user_id
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    console.log('Employee lookup result:', { employee, employeeError });

    // Get all employees for debugging
    const { data: allEmployees, error: allEmployeesError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, auth_user_id, employee_code')
      .limit(10);

    console.log('All employees sample:', { allEmployees, allEmployeesError });

    // Get attendance records for this employee (if found)
    let attendanceRecords = null;
    if (employee) {
      const { data: attendance, error: attendanceError } = await supabaseAdmin
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .limit(5);
      
      console.log('Attendance records:', { attendance, attendanceError });
      attendanceRecords = attendance;
    }

    return NextResponse.json({
      success: true,
      debug: {
        userId,
        authUser: { id: userId },
        employee,
        employeeError: employeeError?.message || null,
        allEmployees: allEmployees || [],
        attendanceRecords: attendanceRecords || [],
        mapping: {
          hasAuthUser: !!userId,
          hasEmployee: !!employee,
          mappingExists: !!employee && employee.auth_user_id === userId
        }
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return handleError(error);
  }
} 