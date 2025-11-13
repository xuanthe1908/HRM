import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';
import { canManageExpenseRequests } from '@/lib/api-auth';

// PUT - Approve/Reject expense request
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { action, rejectionReason } = requestData;

    // user.id is already the employee ID from getAuthenticatedUser
    const employeeId = user.id;

    // Get current expense request to access employee info and permission checks
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('expense_requests')
      .select(`
        *,
        employee:employees!expense_requests_employee_id_fkey (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Expense request not found' }, { status: 404 });
    }

    // Permission checks differ by action
    if (action === 'approve' || action === 'reject') {
      if (!canManageExpenseRequests(user)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else if (action === 'update') {
      const isOwner = currentRequest.employee_id === employeeId;
      const isManager = canManageExpenseRequests(user);
      if (isOwner) {
        // Owner can only edit pending requests
        if (currentRequest.status !== 'pending') {
          return NextResponse.json({ error: 'Only pending requests can be edited by owner' }, { status: 403 });
        }
      } else if (isManager) {
        // Manager can only perform category-only updates on approved requests
        if (currentRequest.status !== 'approved') {
          return NextResponse.json({ error: 'Managers can only edit approved requests' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let updateData: any = {};

    if (action === 'approve') {
      updateData = {
        status: 'approved',
        approved_by: employeeId,
        approved_date: new Date().toISOString().split('T')[0],
      };
    } else if (action === 'reject') {
      updateData = {
        status: 'rejected',
        rejected_by: employeeId,
        rejected_date: new Date().toISOString().split('T')[0],
        rejection_reason: rejectionReason,
      };
    } else if (action === 'update') {
      // Handle update action - update the fields provided in the request
      const isOwner = currentRequest.employee_id === employeeId;
      const isManager = canManageExpenseRequests(user);
      updateData = requestData;
      // Remove control fields
      delete updateData.action;
      delete updateData.rejectionReason;
      // For manager edits on approved requests, restrict to category-only
      if (!isOwner && isManager) {
        updateData = { category: updateData.category };
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updatedRequest, error } = await supabaseAdmin
      .from('expense_requests')
      .update(updateData)
      .eq('id', params.id)
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
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Send notification to employee about status change
    try {
      await NotificationService.notifyExpenseRequestStatusChanged(
        currentRequest.employee_id,
        currentRequest.amount,
        currentRequest.category,
        action === 'approve' ? 'approved' : 'rejected',
        rejectionReason,
        employeeId
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