import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

// GET a specific leave request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticate(req);
    
    const { data, error } = await supabaseAdmin
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
      .eq('id', params.id)
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// PUT - Approve/Reject leave request
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticate(req);
    const requestData = await req.json();
    const { action, rejectionReason } = requestData;

    // Get employee_id from auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get current leave request to access employee info for notification
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    let updateData: any = {};

    if (action === 'approve') {
      updateData = {
        status: 'approved',
        approved_by: employeeData.id,
        approved_at: new Date().toISOString(),
      };
    } else if (action === 'reject') {
      updateData = {
        status: 'rejected',
        rejected_by: employeeData.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updatedRequest, error } = await supabaseAdmin
      .from('leave_requests')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          department:departments(name),
          position:positions(name)
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
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Send notification to employee about status change
    try {
      await NotificationService.notifyLeaveRequestStatusChanged(
        currentRequest.employee_id,
        currentRequest.leave_type,
        currentRequest.start_date,
        currentRequest.end_date,
        action === 'approve' ? 'approved' : 'rejected',
        rejectionReason,
        employeeData.id
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('API error:', error);
    return handleError(error);
  }
}

// DELETE a leave request
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticate(req);
    
    const { error } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
} 