import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import NotificationService, { NOTIFICATION_TEMPLATES } from '@/lib/notification-service';
import { canManageEmployees } from '@/lib/api-auth';

// GET /api/employee-requests - List employee requests
export async function GET(req: NextRequest) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load current employee by auth_user_id
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', authUserId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Normalize role just in case database stores different casing
    const normalizedRole = (currentUser.role as string).toLowerCase() as 'admin' | 'hr' | 'accountant' | 'employee' | 'lead';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const requestType = searchParams.get('type');
    const employeeId = searchParams.get('employeeId');

    let query = supabaseAdmin
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
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (requestType) query = query.eq('request_type', requestType);
    if (employeeId) query = query.eq('employee_id', employeeId);

    // If not HR/Admin, only show own requests
    if (!canManageEmployees({ id: currentUser.id, role: normalizedRole, name: '', email: '' } as any)) {
      query = query.eq('employee_id', currentUser.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/employee-requests - Create new employee request
export async function POST(req: NextRequest) {
  try {
    const authUserId = await authenticate(req);
    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { request_type, request_data } = body;

    // Validate request type
    if (request_type !== 'dependent_persons') {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    // Validate request data
    if (!request_data || typeof request_data.requested_count !== 'number') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Create the request
    const { data, error } = await supabaseAdmin
      .from('employee_requests')
      .insert({
        employee_id: currentUser.id,
        request_type,
        request_data,
        status: 'pending'
      })
      .select(`
        *,
        employee:employees!employee_requests_employee_id_fkey (
          id,
          name,
          employee_code,
          email
        )
      `)
      .single();

    if (error) throw error;

    // Notify HR and Admin about new dependent request
    try {
      if (request_type === 'dependent_persons') {
        const { data: emp, error: empErr } = await supabaseAdmin
          .from('employees')
          .select('name')
          .eq('id', currentUser.id)
          .single();
        if (!empErr && emp) {
          const template = NOTIFICATION_TEMPLATES.DEPENDENT_REQUEST_CREATED(emp.name, request_data.requested_count);
          await NotificationService.sendToRole('hr', template, currentUser.id, `/general-requests`, 'Xem yêu cầu');
          await NotificationService.sendToRole('admin', template, currentUser.id, `/general-requests`, 'Xem yêu cầu');
        }
      }
    } catch (e) {
      console.error('Failed to send dependent request notification:', e);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
