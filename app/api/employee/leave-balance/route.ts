import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { LeaveBalanceService } from '@/lib/leave-balance-service';

// GET current employee's leave balance
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);

    // Lấy employee_id từ auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Lấy thông tin số dư nghỉ phép
    const balance = await LeaveBalanceService.getEmployeeLeaveBalance(employeeData.id);

    if (!balance) {
      return NextResponse.json({ error: 'Error calculating leave balance' }, { status: 500 });
    }

    // Lấy thông tin từ bảng leave_balances
    const currentYear = new Date().getFullYear();
    const { data: leaveBalances, error: balanceError } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeData.id)
      .eq('year', currentYear)
      .single();

    // Kết hợp dữ liệu
    const response = {
      ...balance,
      sick_leave: {
        total: leaveBalances?.sick_leave_total || 0,
        used: leaveBalances?.sick_leave_used || 0,
        remaining: Math.max(0, (leaveBalances?.sick_leave_total || 0) - (leaveBalances?.sick_leave_used || 0))
      },
      personal_leave: {
        total: leaveBalances?.personal_leave_total || 0,
        used: leaveBalances?.personal_leave_used || 0,
        remaining: Math.max(0, (leaveBalances?.personal_leave_total || 0) - (leaveBalances?.personal_leave_used || 0))
      },
      maternity_leave: {
        total: leaveBalances?.maternity_leave_total || 0,
        used: leaveBalances?.maternity_leave_used || 0,
        remaining: Math.max(0, (leaveBalances?.maternity_leave_total || 0) - (leaveBalances?.maternity_leave_used || 0))
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting current employee leave balance:', error);
    return handleError(error);
  }
}

// POST to check if current employee can request specific number of leave days
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { requestedDays } = await req.json();

    if (!requestedDays || requestedDays <= 0) {
      return NextResponse.json({ error: 'Valid requested days is required' }, { status: 400 });
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

    // Kiểm tra khả năng xin nghỉ
    const result = await LeaveBalanceService.canRequestLeave(employeeData.id, requestedDays);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking current employee leave request capability:', error);
    return handleError(error);
  }
}