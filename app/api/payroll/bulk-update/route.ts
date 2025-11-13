import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

export async function PUT(req: NextRequest) {
  try {
    await authenticate(req);
    const { payrollIds, status } = await req.json();

    if (!Array.isArray(payrollIds) || payrollIds.length === 0 || !status) {
      return NextResponse.json({ error: 'payrollIds (array) and status (string) are required' }, { status: 400 });
    }

    // Update the records in the database
    const { data: updatedRecords, error } = await supabaseAdmin
      .from('payroll_records')
      .update({ status: status })
      .in('id', payrollIds)
      .select('id, employee_id, month, year');

    if (error) throw error;

    // --- Trigger notifications for all updated records ---
    if (updatedRecords && updatedRecords.length > 0) {
      // Group by month and year to send notifications in batches
      const notificationsByMonth = updatedRecords.reduce((acc, record) => {
        const key = `${record.month}-${record.year}`;
        if (!acc[key]) {
          acc[key] = { month: record.month, year: record.year, employeeIds: [] };
        }
        acc[key].employeeIds.push(record.employee_id);
        return acc;
      }, {} as Record<string, { month: number; year: number; employeeIds: string[] }>);

      // Send notifications for each batch
      for (const key in notificationsByMonth) {
        const batch = notificationsByMonth[key];
        NotificationService.notifyPayrollStatusUpdate(
          batch.employeeIds,
          batch.month,
          batch.year,
          status,
          undefined // approved_by should be captured if available
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${updatedRecords?.length || 0} records to "${status}"`,
      data: updatedRecords 
    });

  } catch (error) {
    return handleError(error);
  }
}
