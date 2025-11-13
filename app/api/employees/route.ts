import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';
import { auditService } from '@/lib/audit-service';
import { canManageEmployees } from '@/lib/api-auth';

// GET /api/employees - Lấy danh sách nhân viên
export async function GET(req: NextRequest) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, role')
      .eq('auth_user_id', authUserId)
      .single();
    if (employeeError || !employee) return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    const user = { id: employee.id, role: employee.role, name: employee.name, email: employee.email } as any;

    // Check if user can manage employees
    if (!canManageEmployees(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Query với join departments và positions
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        departments(id, name),
        positions(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Employees query failed:', error);
      throw error;
    }

    return NextResponse.json(employees);

  } catch (error) {
    console.error('💥 API Error:', error);
    return handleError(error);
  }
}

// POST /api/employees - Tạo nhân viên mới
export async function POST(req: NextRequest) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, role')
      .eq('auth_user_id', authUserId)
      .single();
    if (employeeError || !employee) return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    const user = { id: employee.id, role: employee.role, name: employee.name, email: employee.email } as any;

    // Check if user can manage employees
    if (!canManageEmployees(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    let employeeData = await req.json();

    console.log('📝 Creating new employee with data:', employeeData);
    
    // Sanitize date fields: convert empty strings to null
    const dateFields = [
      'birth_date', 'id_card_issue_date', 'probation_start_date', 
      'probation_end_date', 'official_start_date', 'contract_end_date'
    ];
    dateFields.forEach(field => {
      if (employeeData[field] === '') {
        employeeData[field] = null;
      }
    });
     // Sanitize empty strings in foreign key fields to null
     const fkFields = ['department_id', 'position_id', 'lead_id', 'manager_id'];
     fkFields.forEach(field => {
       if (employeeData[field] === '') {
         employeeData[field] = null;
       }
     });

    // Use the authenticated user's info directly
    const creatorData = { id: user.id, name: user.name, email: user.email };

    // Validate required fields
    const requiredFields = [
      { field: 'email', label: 'Email' },
      { field: 'name', label: 'Họ và tên' },
      { field: 'employee_code', label: 'Mã nhân viên' },
      { field: 'start_date', label: 'Ngày bắt đầu' }
    ];
    const missingFields = requiredFields.filter(({ field }) => !employeeData[field]);
    
    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(({ label }) => label).join(', ');
      return NextResponse.json({ 
        error: `Vui lòng điền đầy đủ các trường bắt buộc: ${missingLabels}` 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeData.email)) {
      return NextResponse.json({ 
        error: 'Định dạng email không hợp lệ. Vui lòng nhập email đúng định dạng (ví dụ: user@company.com)' 
      }, { status: 400 });
    }

    // Validate start_date format
    if (employeeData.start_date && !Date.parse(employeeData.start_date)) {
      return NextResponse.json({ 
        error: 'Định dạng ngày bắt đầu không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD (ví dụ: 2024-01-15)' 
      }, { status: 400 });
    }

    // Validate numeric fields
    const numericFields = [
      { field: 'base_salary', label: 'Lương cơ bản', min: 0 },
      { field: 'children_count', label: 'Người phụ thuộc', min: 0 },
      { field: 'meal_allowance', label: 'Phụ cấp ăn trưa', min: 0 },
      { field: 'transport_allowance', label: 'Phụ cấp đi lại', min: 0 },
      { field: 'phone_allowance', label: 'Phụ cấp điện thoại', min: 0 },
      { field: 'attendance_allowance', label: 'Phụ cấp chuyên cần', min: 0 }
    ];

    for (const { field, label, min } of numericFields) {
      if (employeeData[field] !== undefined && employeeData[field] !== null && employeeData[field] !== '') {
        const value = Number(employeeData[field]);
        if (isNaN(value) || value < min) {
          return NextResponse.json({ 
            error: `${label} phải là số và không được nhỏ hơn ${min}` 
          }, { status: 400 });
        }
      }
    }

    // Check if employee_code already exists
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('employee_code', employeeData.employee_code)
      .single();

    if (existingEmployee) {
      return NextResponse.json({ 
        error: `Mã nhân viên "${employeeData.employee_code}" đã tồn tại. Vui lòng chọn mã nhân viên khác.` 
      }, { status: 400 });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', employeeData.email)
      .single();

    if (existingEmail) {
      return NextResponse.json({ 
        error: `Email "${employeeData.email}" đã tồn tại. Vui lòng sử dụng email khác.` 
      }, { status: 400 });
    }

    // Check if personal email already exists (if provided)
    if (employeeData.personal_email && employeeData.personal_email !== '') {
      const { data: existingPersonalEmail } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('personal_email', employeeData.personal_email)
        .single();

      if (existingPersonalEmail) {
        return NextResponse.json({ 
          error: `Email cá nhân "${employeeData.personal_email}" đã tồn tại. Vui lòng sử dụng email khác.` 
        }, { status: 400 });
      }
    }

    // Check if ID number already exists (if provided)
    if (employeeData.id_number && employeeData.id_number !== '') {
      const { data: existingIdNumber } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id_number', employeeData.id_number)
        .single();

      if (existingIdNumber) {
        return NextResponse.json({ 
          error: `Số CCCD/CMND "${employeeData.id_number}" đã tồn tại. Vui lòng kiểm tra lại.` 
        }, { status: 400 });
      }
    }

    // Check if tax code already exists (if provided)
    if (employeeData.tax_code && employeeData.tax_code !== '') {
      const { data: existingTaxCode } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('tax_code', employeeData.tax_code)
        .single();

      if (existingTaxCode) {
        return NextResponse.json({ 
          error: `Mã số thuế "${employeeData.tax_code}" đã tồn tại. Vui lòng kiểm tra lại.` 
        }, { status: 400 });
      }
    }

    // Validate foreign key references if provided
    if (employeeData.department_id) {
      const { data: dept } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .eq('id', employeeData.department_id)
        .single();
      
      if (!dept) {
        return NextResponse.json({ 
          error: 'Phòng ban được chọn không tồn tại. Vui lòng chọn phòng ban khác.' 
        }, { status: 400 });
      }
    }

    if (employeeData.position_id) {
      const { data: pos } = await supabaseAdmin
        .from('positions')
        .select('id, name')
        .eq('id', employeeData.position_id)
        .single();
      
      if (!pos) {
        return NextResponse.json({ 
          error: 'Chức vụ được chọn không tồn tại. Vui lòng chọn chức vụ khác.' 
        }, { status: 400 });
      }
    }

    if (employeeData.manager_id) {
      const { data: manager } = await supabaseAdmin
        .from('employees')
        .select('id, name')
        .eq('id', employeeData.manager_id)
        .single();
      
      if (!manager) {
        return NextResponse.json({ 
          error: 'Quản lý trực tiếp được chọn không tồn tại. Vui lòng chọn quản lý khác.' 
        }, { status: 400 });
      }
    }

    console.log('📧 Inviting user for email:', employeeData.email);

    // --- 4. Invite user to set up their password ---
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      employeeData.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/set-password`,
      }
    );

    if (authError || !authUser || !authUser.user) {
      console.error('❌ Auth invitation failed:', authError);
      return NextResponse.json({ 
        error: `Lỗi tạo tài khoản: ${authError?.message || 'Không thể mời người dùng. Vui lòng thử lại.'}` 
      }, { status: 400 });
    }

    console.log('✅ Auth user invited:', authUser.user.id);

    // Prepare employee data for database
    // Force initial status to 'invite_sent' after successful invitation
    const dbEmployeeData = {
      ...employeeData,
      auth_user_id: authUser.user.id,
      status: 'invite_sent',
      role: employeeData.role || 'employee',
    };

    // Remove password from employee data if it exists
    delete dbEmployeeData.password;
    
    console.log('💾 Inserting employee data:', dbEmployeeData);
    
    // Temporarily bypass RLS to insert the employee record
    const { data: newEmployee, error: insertError } = await supabaseAdmin
      .from('employees')
      .insert(dbEmployeeData)
      .select(`
        *,
        departments(id, name),
        positions(id, name)
      `)
      .single();

    if (insertError) {
      console.error('❌ Employee insert failed:', insertError);
      
      // Cleanup: Delete auth user if employee creation failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log('🧹 Cleaned up auth user after failed employee creation');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      // Return user-friendly error message
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'Mã nhân viên hoặc email đã tồn tại. Vui lòng kiểm tra lại thông tin.' 
        }, { status: 400 });
      }
      
      if (insertError.code === '23503') {
        return NextResponse.json({ 
          error: 'Dữ liệu tham chiếu không hợp lệ. Vui lòng kiểm tra lại phòng ban, chức vụ hoặc quản lý trực tiếp.' 
        }, { status: 400 });
      }
      
      if (insertError.code === '23514') {
        return NextResponse.json({ 
          error: 'Dữ liệu không đúng định dạng yêu cầu. Vui lòng kiểm tra lại thông tin nhập vào.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: `Không thể tạo nhân viên: ${insertError.message}`
      }, { status: 500 });
    }

    console.log('✅ Employee created successfully:', newEmployee.id);

    // Log employee creation for audit trail
    try {
      await auditService.logCreate(
        creatorData.id,
        creatorData.name,
        creatorData.email,
        'employees',
        newEmployee.id,
        `Created new employee: ${newEmployee.name} (${newEmployee.employee_code})`,
        newEmployee
      );
    } catch (auditError) {
      console.error('Failed to log employee creation:', auditError);
    }

    // Send welcome notification to new employee
    try {
      await NotificationService.notifyEmployeeWelcome(
        newEmployee.id,
        newEmployee.name,
        creatorData.id
      );
      console.log('📧 Welcome notification sent');
    } catch (notificationError) {
      console.error('Failed to send welcome notification:', notificationError);
    }

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error('💥 Employee creation failed:', error);
    return handleError(error);
  }
}
