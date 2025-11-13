import { NextRequest, NextResponse } from 'next/server';
import { authenticate, handleError } from '@/lib/supabase-server';
import { LeaveBalanceService } from '@/lib/leave-balance-service';

// GET leave balance for specific employee
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticate(req);
    const employeeId = params.id;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Lấy thông tin số dư nghỉ phép
    const balance = await LeaveBalanceService.getEmployeeLeaveBalance(employeeId);

    if (!balance) {
      return NextResponse.json({ error: 'Employee not found or error calculating balance' }, { status: 404 });
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Error getting leave balance:', error);
    return handleError(error);
  }
}

// POST to check if employee can request specific number of leave days
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticate(req);
    const employeeId = params.id;
    const { requestedDays } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    if (!requestedDays || requestedDays <= 0) {
      return NextResponse.json({ error: 'Valid requested days is required' }, { status: 400 });
    }

    // Kiểm tra khả năng xin nghỉ
    const result = await LeaveBalanceService.canRequestLeave(employeeId, requestedDays);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking leave request capability:', error);
    return handleError(error);
  }
}