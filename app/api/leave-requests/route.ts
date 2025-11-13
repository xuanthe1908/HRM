import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';
import { canAccessLeaveRequests, canManageEmployees } from '@/lib/api-auth';

// GET leave requests with optional filters
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
    const status = searchParams.get('status');
    const leaveType = searchParams.get('leaveType');
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Check if user can access leave requests for the specified employee
    if (employeeId && !canAccessLeaveRequests(user, employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          department:departments(name),
          position:positions(name)
        ),
        submitted_by_employee:employees!leave_requests_submitted_by_fkey (
          id,
          name,
          employee_code
        ),
        approved_by_employee:employees!leave_requests_approved_by_fkey (
          id,
          name,
          employee_code
        ),
        rejected_by_employee:employees!leave_requests_rejected_by_fkey (
          id,
          name,
          employee_code
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (leaveType && leaveType !== 'all') {
      query = query.eq('leave_type', leaveType);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    // Enforce non-manager users (Employee/Accountant) only see their own requests
    // If user is not HR/Admin, force filter by their own employee_id
    if (!canManageEmployees(user) && !employeeId) {
      query = query.eq('employee_id', user.id);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// POST a new leave request
export async function POST(req: NextRequest) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, role')
      .eq('auth_user_id', authUserId)
      .single();
    if (employeeError || !employee) return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    const user = { id: employee.id, name: employee.name, role: employee.role } as any;
    const requestData = await req.json();

    // Use totalDays from frontend if provided, otherwise calculate
    let totalDays = requestData.totalDays;
    if (!totalDays && requestData.startDate && requestData.endDate) {
      const startDate = new Date(requestData.startDate);
      const endDate = new Date(requestData.endDate);
      totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Use the authenticated user's ID directly
    const employeeData = { id: user.id, name: user.name };

    // Prepare leave request data
    const leaveRequestData = {
      employee_id: requestData.employeeId || employeeData.id,
      leave_type: requestData.leaveType,
      start_date: requestData.startDate,
      end_date: requestData.endDate,
      total_days: totalDays,
      reason: requestData.reason,
      status: 'pending',
      submitted_by: employeeData.id,
      is_urgent: requestData.isUrgent || false,
      notes: requestData.notes || null,
    };

    // Kiểm tra trùng lặp thời gian nghỉ phép trước khi tạo
    const { data: overlappingRequests, error: overlapError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, start_date, end_date, leave_type, total_days')
      .eq('employee_id', leaveRequestData.employee_id)
      .eq('status', 'approved') // Chỉ kiểm tra đơn đã được duyệt
      .or(`start_date.lte.${leaveRequestData.end_date},end_date.gte.${leaveRequestData.start_date}`);

    if (overlapError) {
      console.error('Error checking overlap:', overlapError);
      return NextResponse.json({ 
        error: 'Lỗi kiểm tra trùng lặp thời gian' 
      }, { status: 500 });
    }

    // Kiểm tra chi tiết từng đơn trùng lặp
    if (overlappingRequests && overlappingRequests.length > 0) {
      const conflicts = [];
      
      for (const request of overlappingRequests) {
        const requestStart = new Date(request.start_date);
        const requestEnd = new Date(request.end_date);
        const newStart = new Date(leaveRequestData.start_date);
        const newEnd = new Date(leaveRequestData.end_date);

        // Kiểm tra có thực sự overlap không
        if (requestStart <= newEnd && requestEnd >= newStart) {
          conflicts.push({
            startDate: request.start_date,
            endDate: request.end_date,
            leaveType: request.leave_type,
            totalDays: request.total_days
          });
        }
      }

      if (conflicts.length > 0) {
        return NextResponse.json({ 
          error: 'Thời gian xin nghỉ bị trùng lặp',
          message: 'Thời gian xin nghỉ bị trùng lặp với đơn nghỉ phép đã được duyệt',
          conflicts: conflicts
        }, { status: 400 });
      }
    }

    console.log('Creating leave request with data:', leaveRequestData);

    const { data: newLeaveRequest, error } = await supabaseAdmin
      .from('leave_requests')
      .insert(leaveRequestData)
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          department:departments(name),
          position:positions(name)
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Send notification to HR and Admin about new leave request
    try {
      await NotificationService.notifyLeaveRequestCreated(
        newLeaveRequest.id,
        employeeData.name,
        requestData.leaveType,
        requestData.startDate,
        requestData.endDate,
        employeeData.id
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(newLeaveRequest, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return handleError(error);
  }
} 