import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';
import { auditService } from '@/lib/audit-service';

// POST /api/notifications/triggers - Manual triggers for testing
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    // Check user permissions (admin/hr only)
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['admin', 'hr'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { triggerType, ...params } = await req.json();

    console.log('🔔 Manual trigger requested:', triggerType, 'by', currentUser.name);

    switch (triggerType) {
      case 'system_maintenance':
        await NotificationService.notifySystemMaintenance(
          params.startTime || new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          params.endTime || new Date(Date.now() + 7200000).toISOString(),   // 2 hours from now
          currentUser.id
        );
        break;

      case 'attendance_warning':
        // Get some employees for demo
        const { data: employees } = await supabaseAdmin
          .from('employees')
          .select('id, name')
          .neq('role', 'admin')
          .limit(3);

        if (employees && employees.length > 0) {
          // Simulate attendance alerts for different types
          const alertTypes = ['late', 'absent', 'early_leave'] as const;
          for (let i = 0; i < Math.min(employees.length, 3); i++) {
            const employee = employees[i];
            const alertType = alertTypes[i % alertTypes.length];
            await NotificationService.notifyAttendanceAlert(
              employee.id,
              employee.name,
              alertType,
              new Date().toLocaleDateString('vi-VN'),
              currentUser.id
            );
          }
        }
        break;

      case 'payroll_approval':
        // Get all employees for payroll notification
        const { data: allEmployees } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('status', 'active');

        if (allEmployees) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          
          await NotificationService.notifyPayrollApproved(
            allEmployees.map(emp => emp.id),
            currentMonth,
            currentYear,
            currentUser.id
          );
        }
        break;

      case 'payroll_generated':
        // Get all employees for payroll notification
        const { data: payrollEmployees } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('status', 'active');

        if (payrollEmployees) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          
          await NotificationService.notifyPayrollGenerated(
            payrollEmployees.map(emp => emp.id),
            currentMonth,
            currentYear,
            currentUser.id
          );
        }
        break;

      case 'employee_welcome':
        // Get a recent employee
        const { data: recentEmployee } = await supabaseAdmin
          .from('employees')
          .select('id, name')
          .neq('id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentEmployee) {
          await NotificationService.notifyEmployeeWelcome(
            recentEmployee.id,
            recentEmployee.name,
            currentUser.id
          );
        }
        break;

      default:
        return NextResponse.json({ error: 'Unknown trigger type' }, { status: 400 });
    }

    // Log trigger execution for audit trail
    await auditService.log({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_email: currentUser.email,
      action: 'EXECUTE_TRIGGER',
      resource: `notifications/triggers/${triggerType}`,
      details: `Manual trigger executed: ${triggerType}`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
      request_method: 'POST',
      status_code: 200
    });

    return NextResponse.json({ 
      success: true, 
      message: `Trigger "${triggerType}" executed successfully`,
      note: 'Check notification settings if notifications were not sent'
    });

  } catch (error) {
    console.error('Error executing trigger:', error);
    return handleError(error);
  }
} 