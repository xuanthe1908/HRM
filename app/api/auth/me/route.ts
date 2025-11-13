import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // 1. Xác thực token và lấy user ID
    const userId = await authenticate(req);

    // 2. Dùng userId để truy vấn thông tin trong bảng 'employees' 
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError) {
      if (employeeError.code === 'PGRST116') { 
        return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
      }
      throw employeeError;
    }

    // 3. Lấy thông tin department nếu có
    let department = null;
    if (employee.department_id) {
      const { data: deptData } = await supabaseAdmin
        .from('departments')
        .select('id, name, description')
        .eq('id', employee.department_id)
        .single();
      department = deptData;
    }

    // 4. Lấy thông tin position nếu có  
    let position = null;
    if (employee.position_id) {
      const { data: posData } = await supabaseAdmin
        .from('positions')
        .select('id, name, description')
        .eq('id', employee.position_id)
        .single();
      position = posData;
    }

    // 5. Lấy thông tin lead nếu có
    let lead = null;
    if (employee.lead_id) {
      const { data: leadData } = await supabaseAdmin
        .from('employees')
        .select('id, name, email')
        .eq('id', employee.lead_id)
        .single();
      lead = leadData;
    }

    // 6. Kiểm tra trạng thái nhân viên
    if (employee.status === 'terminated') {
      return NextResponse.json({ 
        error: 'Account terminated',
        message: 'Tài khoản đã bị vô hiệu hóa do đã nghỉ việc'
      }, { status: 403 });
    }

    // 7. Kết hợp dữ liệu
    const result = {
      ...employee,
      department,
      position,
      lead
    };

    return NextResponse.json(result);

  } catch (error) {
    return handleError(error);
  }
} 