import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

// GET /api/payroll - Lấy danh sách bảng lương
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    // TODO: Thêm logic phân trang và lọc ở đây
    const { data, error } = await supabaseAdmin.from('payroll_records').select('*');
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/payroll - Tạo bảng lương mới
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const payrollData = await req.json();

    // Get employee_id from auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('payroll_records')
      .insert(payrollData)
      .select(`
        *,
        employee:employees!payroll_records_employee_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    // Send notification to employee about new payroll
    try {
      await NotificationService.notifyPayrollGenerated(
        [data.employee_id],
        data.month,
        data.year,
        employeeData.id
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
} 