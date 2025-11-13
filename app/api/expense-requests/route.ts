import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';
import { canAccessExpenseRequests, canManageExpenseRequests } from '@/lib/api-auth';

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
    
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    // Check if user can access expense requests for the specified employee
    if (employeeId && !canAccessExpenseRequests(user, employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    let query = supabaseAdmin
      .from('expense_requests')
      .select(`
        *,
        employee:employees!expense_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          department:departments(name),
          position:positions(name)
        ),
        approved_by_employee:employees!expense_requests_approved_by_fkey (
          id,
          name,
          employee_code
        ),
        rejected_by_employee:employees!expense_requests_rejected_by_fkey (
          id,
          name,
          employee_code
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    // Enforce non-manager users (Employee) only see their own requests
    // If user is not HR/Admin/Accountant, force filter by their own employee_id
    if (!canManageExpenseRequests(user) && !employeeId) {
      query = query.eq('employee_id', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Thêm thông tin mapping cho mỗi expense request
    const expensesWithMapping = await Promise.all(
      data.map(async (expense) => {
        // Kiểm tra xem expense đã được liên kết chưa
        const { data: mappingData } = await supabaseAdmin
          .rpc('get_expense_financial_mapping', { expense_id: expense.id });
        
        return {
          ...expense,
          is_mapped: mappingData && mappingData.length > 0,
          mapping_info: mappingData && mappingData.length > 0 ? mappingData[0] : null
        };
      })
    );

    return NextResponse.json(expensesWithMapping);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const body = await req.json();

    // Validate required fields
    if (!body.category || !body.description || !body.amount || !body.date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get employee_id from auth_user_id
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Associated employee not found for the current user.' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('expense_requests')
      .insert({
        category: body.category,
        description: body.description,
        amount: body.amount,
        date: body.date,
        notes: body.notes,
        attachments: body.attachments,
        file_attachments: body.file_attachments,
        employee_id: employee.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification to Admin and Accountant about new expense request
    try {
      const { data: employeeData, error: empError } = await supabaseAdmin
        .from('employees')
        .select('name')
        .eq('id', employee.id)
        .single();

      if (!empError && employeeData) {
        await NotificationService.notifyExpenseRequestCreated(
          data.id,
          employeeData.name,
          data.amount,
          data.category,
          employee.id
        );
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating expense request:', error);
    return handleError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await authenticate(req);
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing expense request ID' }, { status: 400 });
    }

    // Handle approval action
    if (body.action === 'approve') {
      // Kiểm tra xem expense đã được liên kết chưa
      const { data: existingMapping } = await supabaseAdmin
        .rpc('check_expense_already_mapped', { expense_id: id });

      if (existingMapping) {
        return NextResponse.json({ 
          error: 'Expense request has already been mapped to a financial transaction' 
        }, { status: 409 });
      }

      // Update status to approved
      const { data, error } = await supabaseAdmin
        .from('expense_requests')
        .update({ status: 'approved' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data);
    }

    // Handle rejection action
    if (body.action === 'reject') {
      const { data, error } = await supabaseAdmin
        .from('expense_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: body.rejectionReason 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data);
    }

    // Handle regular update
    const { data, error } = await supabaseAdmin
      .from('expense_requests')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating expense request:', error);
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await authenticate(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing expense request ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('expense_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Expense request deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense request:', error);
    return handleError(error);
  }
} 