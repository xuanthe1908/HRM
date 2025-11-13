import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

// GET /api/payroll/[id] - Lấy chi tiết một bảng lương
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticate(req);
    const { id } = params;
    const { data, error } = await supabaseAdmin.from('payroll_records').select('*').eq('id', id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/payroll/[id] - Cập nhật một bảng lương (bao gồm cả trạng thái)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticate(req);
    const { id } = params;
    const payrollData = await req.json();

    const { data, error } = await supabaseAdmin
      .from('payroll_records')
      .update(payrollData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // --- Trigger notification for any status update ---
    if (payrollData.status && data) {
      // We don't need to await this, it can run in the background
      NotificationService.notifyPayrollStatusUpdate(
        [data.employee_id],
        data.month,
        data.year,
        payrollData.status,
        undefined // approved_by should be captured if available
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/payroll/[id] - Xóa một bảng lương
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticate(req);
    const { id } = params;

    const { error } = await supabaseAdmin.from('payroll_records').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
} 