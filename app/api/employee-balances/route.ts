import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET - Lấy danh sách số dư tất cả nhân viên
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status'); // positive, negative, zero

    // Kiểm tra quyền
    const { data: userEmployee, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !userEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    let query;

    if (employeeId) {
      // Lấy số dư của một nhân viên cụ thể
      if (userEmployee.id !== employeeId && !['admin', 'hr'].includes(userEmployee.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .rpc('get_employee_balance_info', { p_employee_id: employeeId });

      if (error) throw error;
      
      return NextResponse.json(data[0] || null);
    } else {
      // Lấy tất cả số dư (chỉ admin/hr mới được)
      if (!['admin', 'hr'].includes(userEmployee.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .rpc('get_all_employee_balances');

      if (error) throw error;

      // Lọc theo status nếu có
      let filteredData = data;
      if (status) {
        filteredData = data.filter((item: any) => {
          if (status === 'positive') return item.current_balance > 0;
          if (status === 'negative') return item.current_balance < 0;
          if (status === 'zero') return item.current_balance === 0;
          return true;
        });
      }

      return NextResponse.json(filteredData);
    }
  } catch (error) {
    return handleError(error);
  }
}

// POST - Điều chỉnh số dư nhân viên
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const requestData = await req.json();
    
    const { employeeId, amount, description, notes, action } = requestData;

    // Kiểm tra quyền (chỉ admin/hr mới được điều chỉnh)
    const { data: userEmployee, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !userEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!['admin', 'hr'].includes(userEmployee.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate input
    if (!employeeId || !amount || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: employeeId, amount, description' 
      }, { status: 400 });
    }

    let finalAmount = parseFloat(amount);
    let finalDescription = description;

    // Xử lý theo action
    if (action === 'settlement') {
      // Thanh toán cuối tháng
      const { data, error } = await supabaseAdmin
        .rpc('monthly_balance_settlement', {
          p_employee_id: employeeId,
          p_settlement_amount: finalAmount,
          p_notes: notes,
          p_created_by: userEmployee.id
        });

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        message: 'Thanh toán cuối tháng thành công',
        amount: finalAmount
      });
    } else {
      // Điều chỉnh số dư thông thường
      const { data, error } = await supabaseAdmin
        .rpc('adjust_employee_balance', {
          p_employee_id: employeeId,
          p_amount: finalAmount,
          p_description: finalDescription,
          p_notes: notes,
          p_created_by: userEmployee.id
        });

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        message: 'Điều chỉnh số dư thành công',
        amount: finalAmount
      });
    }
  } catch (error) {
    return handleError(error);
  }
}

