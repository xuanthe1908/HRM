import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import NotificationService, { type NotificationTemplate } from '@/lib/notification-service';
import { isProfileComplete } from '@/lib/profile-completion-check';
import { hasAdminAccess, hasHRAccess, canManageEmployees } from '@/lib/role-types';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/employees/[id] - Lấy thông tin chi tiết một nhân viên
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const { data, error } = await supabaseAdmin.from('employees').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/employees/[id] - Cập nhật thông tin nhân viên
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const userId = await authenticate(req);
    const employeeData = await req.json();
    
    console.log('🚀 PUT /api/employees/[id] - Starting update for employee:', id);
    console.log('📝 Received data:', JSON.stringify(employeeData, null, 2));

    // Kiểm tra xem user có quyền cập nhật employee này không
    const { data: currentEmployee, error: fetchError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Employee not found:', fetchError);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log('👤 Current employee:', currentEmployee);

    // Chỉ cho phép user cập nhật profile của chính mình
    // hoặc admin/hr có thể cập nhật bất kỳ profile nào
    const { data: requestingUser } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('auth_user_id', userId)
      .single();

    const canEdit = currentEmployee.auth_user_id === userId || 
                   (requestingUser && (hasAdminAccess(requestingUser.role) || hasHRAccess(requestingUser.role)));

    console.log('🔐 Authorization check:', {
      currentEmployeeAuthUserId: currentEmployee.auth_user_id,
      requestingUserId: userId,
      requestingUserRole: requestingUser?.role,
      canEdit
    });

    if (!canEdit) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized to edit this profile' }, { status: 403 });
    }

    // Danh sách trường được phép cập nhật bởi employee (tự cập nhật hồ sơ)
    const allowedFields = [
      'name',
      'phone',
      'birth_date',
      // Avatar
      'avatar_url',
      // Thông tin cá nhân
      'gender',
      'marital_status',
      'children_count',
      'ethnicity',
      'religion',
      'nationality',
      'education_level',
      // Định danh
      'id_number',
      'social_insurance_number',
      'tax_code',
      'id_card_issue_date',
      'id_card_issue_place',
      // Địa chỉ
      'permanent_address',
      'current_address',
      // Ngân hàng
      'bank_account',
      'bank_name',
      // Khác
      'personal_email',
    ];
    
    // Nếu là admin/hr thì có thể cập nhật nhiều trường hơn
    const adminFields = [
      ...allowedFields, 
      'email', 
      'employee_code', 
      'department_id', 
      'position_id', 
      'lead_id', 
      'manager_id',
      'base_salary', 
      'status',
      'role', // Thêm role vào danh sách cho admin/hr
      'personal_email',
      'gender',
      'birth_date',
      'marital_status',
      'children_count',
      'ethnicity',
      'religion',
      'nationality',
      'education_level',
      'id_number',
      'social_insurance_number',
      'tax_code',
      'id_card_issue_date',
      'id_card_issue_place',
      'permanent_address',
      'current_address',
      'bank_account',
      'bank_name',
      'job_level',
      'job_position',
      'probation_start_date',
      'probation_end_date',
      'probation_result',
      'official_start_date',
      'contract_type',
      'contract_end_date',
      'meal_allowance',
      'transport_allowance',
      'phone_allowance',
      'attendance_allowance',
      'company_insurance_amount',
      'employee_insurance_amount',
      'personal_deduction',
      'tax_type',
      'health_insurance_place',
      'preferences',
      'address'
    ];
    
    const fieldsToUpdate = requestingUser && (hasAdminAccess(requestingUser.role) || hasHRAccess(requestingUser.role))
      ? adminFields 
      : allowedFields;

    // Lọc chỉ những trường được phép
    const filteredData = Object.keys(employeeData)
      .filter(key => fieldsToUpdate.includes(key))
      .reduce((obj, key) => {
        obj[key] = employeeData[key];
        return obj;
      }, {} as any);

    console.log('🔍 Data filtering:', {
      originalKeys: Object.keys(employeeData),
      allowedFields: fieldsToUpdate,
      filteredKeys: Object.keys(filteredData),
      hasRole: 'role' in employeeData,
      roleValue: employeeData.role
    });

    // Không cho phép cập nhật các trường nhạy cảm
    // Chỉ admin/hr mới được phép cập nhật role
    if (!requestingUser || !(hasAdminAccess(requestingUser.role) || hasHRAccess(requestingUser.role))) {
      delete filteredData.role;
    } else if (filteredData.role) {
      // Validate role values
      const validRoles = ['admin', 'hr', 'lead', 'accountant', 'employee'];
      if (!validRoles.includes(filteredData.role)) {
        return NextResponse.json({ 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        }, { status: 400 });
      }
      console.log('✅ Role validation passed:', filteredData.role);
    }
    delete filteredData.auth_user_id;
    delete filteredData.id;

    // If the invited user starts updating their own profile, automatically move status to 'pending'
    // This does not require the client to send 'status' and applies only for self-edit when current status is 'invite_sent'
    const isSelfEditing = currentEmployee.auth_user_id === userId;
    if (isSelfEditing && currentEmployee.status === 'invite_sent') {
      filteredData.status = 'pending';
    }
    
    // Chỉ cho phép admin/hr cập nhật employee_code
    if (!requestingUser || !(hasAdminAccess(requestingUser.role) || hasHRAccess(requestingUser.role))) {
      delete filteredData.employee_code;
    } else if (filteredData.employee_code) {
      // Kiểm tra xem employee_code mới có bị trùng lặp không
      const { data: existingEmployees, error: checkError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('employee_code', filteredData.employee_code)
        .neq('id', id); // Loại trừ employee hiện tại

      if (checkError) {
        console.error('❌ Error checking employee_code:', checkError);
        return NextResponse.json({ 
          error: 'Error checking employee code' 
        }, { status: 500 });
      }

      if (existingEmployees && existingEmployees.length > 0) {
        return NextResponse.json({ 
          error: 'Employee code already exists' 
        }, { status: 400 });
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Debug logging
    console.log('🔍 Debug - Original data:', JSON.stringify(employeeData, null, 2));
    console.log('🔍 Debug - Filtered data:', JSON.stringify(filteredData, null, 2));
    console.log('🔍 Debug - Fields to update:', fieldsToUpdate);

    // Loại bỏ các trường có giá trị undefined hoặc null và chuyển đổi kiểu dữ liệu
    const cleanData = Object.keys(filteredData).reduce((obj, key) => {
      // Special case: allow explicit null to clear avatar_url
      if (key === 'avatar_url' && filteredData[key] === null) {
        obj[key] = null;
        return obj;
      }
      if (filteredData[key] !== undefined && filteredData[key] !== null) {
        // Chuyển đổi các trường số
        if (['meal_allowance', 'transport_allowance', 'phone_allowance', 'attendance_allowance', 
             'company_insurance_amount', 'employee_insurance_amount', 'personal_deduction',
             'base_salary', 'children_count', 'total_leave_hours', 'leave_days_used'].includes(key)) {
          const numValue = Number(filteredData[key]);
          if (!isNaN(numValue)) {
            obj[key] = numValue;
          } else {
            console.warn(`⚠️ Invalid number value for ${key}:`, filteredData[key]);
          }
        } else {
          obj[key] = filteredData[key];
        }
      }
      return obj;
    }, {} as any);

    console.log('🔍 Debug - Clean data:', cleanData);

    // Kiểm tra xem có dữ liệu để cập nhật không
    if (Object.keys(cleanData).length === 0) {
      console.log('⚠️ No valid data to update');
      return NextResponse.json({ error: 'No valid data to update' }, { status: 400 });
    }

    // Kiểm tra các trường có giá trị hợp lệ
    const invalidFields = [];
    for (const [key, value] of Object.entries(cleanData)) {
      // Allow explicit null for avatar_url to clear it
      if (key === 'avatar_url') continue;
      if (value === '' || value === null || value === undefined) {
        invalidFields.push(key);
      }
    }

    if (invalidFields.length > 0) {
      console.log('⚠️ Invalid fields found:', invalidFields);
      // Loại bỏ các trường không hợp lệ
      invalidFields.forEach(field => delete cleanData[field]);
    }

    console.log('🔍 Final clean data:', JSON.stringify(cleanData, null, 2));

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(cleanData)
      .eq('id', id)
      .select(`
        *,
        department:departments(id, name, description),
        position:positions(id, name, description)
      `)
      .single();

    if (error) {
      console.error('❌ Supabase update error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Trả về lỗi chi tiết hơn
      return NextResponse.json({ 
        error: 'Database update failed',
        details: error.message,
        code: error.code
      }, { status: 400 });
    }

    console.log('✅ Employee update successful:', {
      employeeId: id,
      updatedFields: Object.keys(cleanData),
      newRole: data?.role || 'unchanged'
    });

    // Nếu user tự hoàn thiện hồ sơ lần đầu tiên, gửi thông báo đến tất cả HR
    try {
      const wasComplete = isProfileComplete(currentEmployee as any);
      const isNowComplete = isProfileComplete(data as any);
      if (!wasComplete && isNowComplete) {
        // Lấy danh sách tất cả nhân sự HR
        const { data: hrUsers, error: hrError } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('role', 'hr');

        if (!hrError && hrUsers && hrUsers.length > 0) {
          const hrIds = hrUsers.map(u => u.id);
          const template: NotificationTemplate = {
            title: 'Nhân viên đã hoàn tất hồ sơ',
            message: `Nhân viên ${data.name} (${data.employee_code}) đã hoàn tất hồ sơ cá nhân.`,
            type: 'success',
            category: 'system',
            priority: 'low'
          };
          await NotificationService.sendToUsers(
            hrIds,
            template,
            currentEmployee.id,
            '/employees',
            'Mở quản lý nhân sự'
          );
        } else {
          console.warn('⚠️ Không tìm thấy người dùng HR để gửi thông báo hoặc có lỗi khi truy vấn.', hrError);
        }
      }
    } catch (notifErr) {
      console.warn('⚠️ Không thể gửi thông báo hoàn tất hồ sơ:', notifErr);
    }

    // Kiểm tra nếu status được chuyển thành 'terminated' thì vô hiệu hóa tài khoản Auth
    if (cleanData.status === 'terminated' && data?.auth_user_id) {
      try {
        console.log('🔐 Disabling Supabase Auth account for terminated employee:', data.auth_user_id);
        
        // Vô hiệu hóa tài khoản trong Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          data.auth_user_id,
          { 
            user_metadata: { 
              status: 'terminated',
              terminated_at: new Date().toISOString()
            },
            app_metadata: {
              status: 'terminated'
            }
          }
        );

        if (authError) {
          console.error('❌ Failed to disable Auth account:', authError);
          // Không throw error vì employee đã được cập nhật thành công
        } else {
          console.log('✅ Auth account disabled successfully');
        }
      } catch (error) {
        console.error('❌ Error disabling Auth account:', error);
        // Không throw error vì employee đã được cập nhật thành công
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Unexpected error in PUT /api/employees/[id]:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/employees/[id] - Xóa nhân viên
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);

    console.log(`🗑️ Bắt đầu xóa employee với ID: ${id}`);

    // Kiểm tra xem employee có tồn tại không
    const { data: emp, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('auth_user_id, name, employee_code')
        .eq('id', id)
        .single();
    
    if(fetchError || !emp) {
        console.error('❌ Employee không tồn tại:', fetchError);
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log(`📋 Tìm thấy employee: ${emp.name} (${emp.employee_code})`);

    // Xóa dữ liệu liên quan theo lô và chạy song song để giảm thời gian phản hồi
    const directDeleteTables = [
      'attendance_records',
      'leave_requests',
      'payroll_records',
      'salary_allowances',
      'salary_deductions',
      'leave_balances',
      'expense_requests',
      'employee_dependents',
    ];

    const deletePromises: Promise<any>[] = [];

    // Xóa trực tiếp các bảng có cột employee_id
    for (const table of directDeleteTables) {
      deletePromises.push((async () => {
        await supabaseAdmin
          .from(table)
          .delete()
          .eq('employee_id', id);
      })());
    }

    // Xóa notifications theo created_by
    deletePromises.push((async () => {
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('created_by', id);
    })());

    // Xóa các tham chiếu theo nhiều field ở nhiều bảng (bỏ qua lỗi nếu field không tồn tại)
    const referenceTables = [
      'attendance_records',
      'leave_requests',
      'expense_requests',
      'payroll_records',
      'financial_transactions',
      'salary_regulations',
      'company_settings',
      'audit_logs',
      'financial_targets',
      'budgets',
    ];
    const referenceFields = ['created_by', 'submitted_by', 'approved_by', 'rejected_by', 'updated_by', 'user_id'];

    for (const table of referenceTables) {
      for (const field of referenceFields) {
        deletePromises.push((async () => {
          // @ts-ignore - field có thể không tồn tại, PostgREST sẽ trả lỗi và chúng ta bỏ qua
          await supabaseAdmin
            .from(table)
            .delete()
            .eq(field as any, id);
        })());
      }
    }

    // Thực thi song song và bỏ qua các lỗi không quan trọng
    const results = await Promise.allSettled(deletePromises);
    const criticalErrors = results.filter(r => r.status === 'rejected');
    if (criticalErrors.length > 0) {
      console.warn('⚠️ Một số thao tác xóa phụ trợ thất bại (được bỏ qua).');
    }

    // 6. Kiểm tra manager_id (self-reference)
    const { data: managedEmployees, error: managedError } = await supabaseAdmin
        .from('employees')
        .select('id, name')
        .eq('manager_id', id);

    if (managedError) {
        console.error('❌ Lỗi kiểm tra managed employees:', managedError);
    } else if (managedEmployees && managedEmployees.length > 0) {
        console.log(`⚠️ Có ${managedEmployees.length} nhân viên được quản lý, sẽ cập nhật manager_id...`);
        
        // Cập nhật manager_id thành null cho các nhân viên được quản lý
        const { error: updateManagerError } = await supabaseAdmin
            .from('employees')
            .update({ manager_id: null })
            .eq('manager_id', id);
        
        if (updateManagerError) {
            console.error('❌ Lỗi cập nhật manager_id:', updateManagerError);
            return NextResponse.json({ 
                error: 'Không thể cập nhật thông tin quản lý' 
            }, { status: 400 });
        }
    }

    console.log('✅ Đã xóa dữ liệu liên quan (song song)');

    // 7. Xóa employee
    const { error: deleteEmpError } = await supabaseAdmin
        .from('employees')
        .delete()
        .eq('id', id);

    if (deleteEmpError) {
        console.error('❌ Lỗi xóa employee:', deleteEmpError);
        throw deleteEmpError;
    }

    console.log('✅ Đã xóa employee thành công');

    // 8. Xóa user trong Supabase Auth nếu có
    if (emp.auth_user_id) {
        try {
            await supabaseAdmin.auth.admin.deleteUser(emp.auth_user_id);
            console.log('✅ Đã xóa user trong Auth');
        } catch (authError) {
            console.error('⚠️ Lỗi xóa user trong Auth:', authError);
            // Không throw error vì employee đã được xóa thành công
        }
    }

    return NextResponse.json({ 
        message: 'Employee deleted successfully',
        deletedEmployee: {
            id,
            name: emp.name,
            employeeCode: emp.employee_code
        }
    }, { status: 200 });

  } catch (error) {
    console.error('💥 Lỗi xóa employee:', error);
    return handleError(error);
  }
} 