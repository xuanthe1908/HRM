import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// POST /api/leave-requests/check-overlap - Kiểm tra trùng lặp thời gian nghỉ phép
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { startDate, endDate, excludeRequestId } = await req.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Ngày bắt đầu và ngày kết thúc là bắt buộc' 
      }, { status: 400 });
    }

    // Lấy employee_id từ auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Kiểm tra có đơn nghỉ phép nào được duyệt (approved) trùng thời gian không
    let query = supabaseAdmin
      .from('leave_requests')
      .select('id, start_date, end_date, leave_type, total_days, reason')
      .eq('employee_id', employeeData.id)
      .eq('status', 'approved') // Chỉ kiểm tra đơn đã được duyệt
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`); // Kiểm tra overlap

    // Nếu có excludeRequestId thì loại trừ (dành cho trường hợp edit)
    if (excludeRequestId) {
      query = query.neq('id', excludeRequestId);
    }

    const { data: overlappingRequests, error } = await query;

    if (error) {
      console.error('Error checking overlap:', error);
      return NextResponse.json({ 
        error: 'Lỗi kiểm tra trùng lặp' 
      }, { status: 500 });
    }

    // Kiểm tra chi tiết từng đơn trùng lặp
    const conflicts = [];
    
    if (overlappingRequests && overlappingRequests.length > 0) {
      for (const request of overlappingRequests) {
        const requestStart = new Date(request.start_date);
        const requestEnd = new Date(request.end_date);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        // Kiểm tra có thực sự overlap không
        if (requestStart <= newEnd && requestEnd >= newStart) {
          conflicts.push({
            id: request.id,
            startDate: request.start_date,
            endDate: request.end_date,
            leaveType: request.leave_type,
            totalDays: request.total_days,
            reason: request.reason,
            overlapStart: requestStart > newStart ? request.start_date : startDate,
            overlapEnd: requestEnd < newEnd ? request.end_date : endDate
          });
        }
      }
    }

    return NextResponse.json({
      hasOverlap: conflicts.length > 0,
      conflicts: conflicts,
      message: conflicts.length > 0 
        ? 'Thời gian xin nghỉ bị trùng lặp với đơn nghỉ phép đã được duyệt'
        : 'Không có trùng lặp thời gian'
    });

  } catch (error) {
    console.error('Check overlap error:', error);
    return handleError(error);
  }
}

// GET /api/leave-requests/check-overlap - Kiểm tra trùng lặp qua query params
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const excludeRequestId = searchParams.get('excludeRequestId');

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Ngày bắt đầu và ngày kết thúc là bắt buộc' 
      }, { status: 400 });
    }

    // Lấy employee_id từ auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Kiểm tra có đơn nghỉ phép nào được duyệt (approved) trùng thời gian không
    let query = supabaseAdmin
      .from('leave_requests')
      .select('id, start_date, end_date, leave_type, total_days, reason')
      .eq('employee_id', employeeData.id)
      .eq('status', 'approved') // Chỉ kiểm tra đơn đã được duyệt
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`); // Kiểm tra overlap

    // Nếu có excludeRequestId thì loại trừ (dành cho trường hợp edit)
    if (excludeRequestId) {
      query = query.neq('id', excludeRequestId);
    }

    const { data: overlappingRequests, error } = await query;

    if (error) {
      console.error('Error checking overlap:', error);
      return NextResponse.json({ 
        error: 'Lỗi kiểm tra trùng lặp' 
      }, { status: 500 });
    }

    // Kiểm tra chi tiết từng đơn trùng lặp
    const conflicts = [];
    
    if (overlappingRequests && overlappingRequests.length > 0) {
      for (const request of overlappingRequests) {
        const requestStart = new Date(request.start_date);
        const requestEnd = new Date(request.end_date);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        // Kiểm tra có thực sự overlap không
        if (requestStart <= newEnd && requestEnd >= newStart) {
          conflicts.push({
            id: request.id,
            startDate: request.start_date,
            endDate: request.end_date,
            leaveType: request.leave_type,
            totalDays: request.total_days,
            reason: request.reason,
            overlapStart: requestStart > newStart ? request.start_date : startDate,
            overlapEnd: requestEnd < newEnd ? request.end_date : endDate
          });
        }
      }
    }

    return NextResponse.json({
      hasOverlap: conflicts.length > 0,
      conflicts: conflicts,
      message: conflicts.length > 0 
        ? 'Thời gian xin nghỉ bị trùng lặp với đơn nghỉ phép đã được duyệt'
        : 'Không có trùng lặp thời gian'
    });

  } catch (error) {
    console.error('Check overlap error:', error);
    return handleError(error);
  }
}
