import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, handleError, supabaseAdmin } from '@/lib/supabase-server';
import { EmployeeBalanceService } from '@/lib/employee-balance-service';
import { canAccessEmployeeData } from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', authUserId)
      .single();
    if (employeeError || !employee) return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    const user = { id: employee.id, role: employee.role } as any;
    
    // Check if user can access this employee's data
    if (!canAccessEmployeeData(user, params.employeeId)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const employeeBalance = await EmployeeBalanceService.getEmployeeBalance(params.employeeId);
    
    return NextResponse.json(employeeBalance);
  } catch (error) {
    console.error('Error getting employee balance:', error);
    return handleError(error);
  }
}
