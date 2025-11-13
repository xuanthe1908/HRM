import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import NotificationService, { NOTIFICATION_TEMPLATES } from '@/lib/notification-service';
import { canManageEmployees } from '@/lib/api-auth';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/employee-requests/[id] - Get specific request
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', authUserId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('employee_requests')
      .select(`
        *,
        employee:employees!employee_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          email
        ),
        reviewer:employees!employee_requests_reviewed_by_fkey (
          id,
          name,
          employee_code
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;

    // Check if user can access this request
    if (!canManageEmployees(currentUser.role) && data.employee_id !== currentUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/employee-requests/[id] - Review request (HR/Admin only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', authUserId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Only HR/Admin can review requests
    const normalizedRole = (currentUser.role as string).toLowerCase() as 'admin' | 'hr' | 'accountant' | 'employee' | 'lead';
    if (!canManageEmployees({ id: currentUser.id, role: normalizedRole, name: '', email: '' } as any)) {
      return NextResponse.json({ error: 'Unauthorized to review requests' }, { status: 403 });
    }

    const body = await req.json();
    const { status, review_notes } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get the current request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('employee_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    // Update the request
    const { data, error } = await supabaseAdmin
      .from('employee_requests')
      .update({
        status,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        review_notes
      })
      .eq('id', params.id)
      .select(`
        *,
        employee:employees!employee_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          email
        ),
        reviewer:employees!employee_requests_reviewed_by_fkey (
          id,
          name,
          employee_code
        )
      `)
      .single();

    if (error) throw error;

    // If approved and it's a dependent persons request, update the employee's children_count
    if (status === 'approved' && currentRequest.request_type === 'dependent_persons') {
      const requestData = currentRequest.request_data as any;
      const newCount = requestData.requested_count;

      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ children_count: newCount })
        .eq('id', currentRequest.employee_id);

      if (updateError) {
        console.error('Error updating employee children_count:', updateError);
        // Don't fail the request, just log the error
      }
    }

    // Notifications: to employee and to HR/Admin if needed
    try {
      if (currentRequest.request_type === 'dependent_persons') {
        const requestData = currentRequest.request_data as any;
        if (status === 'approved') {
          const template = NOTIFICATION_TEMPLATES.DEPENDENT_REQUEST_APPROVED(requestData.requested_count);
          await NotificationService.sendToUsers([currentRequest.employee_id], template, currentUser.id, `/employee/profile`, 'Xem hồ sơ');
        } else if (status === 'rejected') {
          const template = NOTIFICATION_TEMPLATES.DEPENDENT_REQUEST_REJECTED(requestData.requested_count, review_notes);
          await NotificationService.sendToUsers([currentRequest.employee_id], template, currentUser.id, `/employee/profile`, 'Xem chi tiết');
        }
      }
    } catch (e) {
      console.error('Failed to send dependent request review notification:', e);
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}
