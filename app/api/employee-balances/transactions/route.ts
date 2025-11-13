import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET - Lấy lịch sử giao dịch số dư nhân viên
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Kiểm tra quyền
    const { data: userEmployee, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !userEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Nếu không có employeeId, trả về lỗi
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Kiểm tra quyền xem lịch sử
    if (userEmployee.id !== employeeId && !['admin', 'hr'].includes(userEmployee.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Lấy lịch sử giao dịch
    const { data, error } = await supabaseAdmin
      .rpc('get_employee_transaction_history', {
        p_employee_id: employeeId,
        p_limit: limit,
        p_offset: offset
      });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

