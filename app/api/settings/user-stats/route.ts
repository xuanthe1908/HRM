import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export interface UserStats {
  total_users: number;
  admin_count: number;
  hr_count: number;
  lead_count: number;
  accountant_count: number;
  employee_count: number;
  active_users: number;
  inactive_users: number;
  by_department: {
    department_name: string;
    count: number;
  }[];
}

// GET /api/settings/user-stats - Lấy thống kê users
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);

    // Get total users by role
    const { data: roleStats, error: roleError } = await supabaseAdmin
      .from('employees')
      .select('role, status')
      .neq('status', 'terminated'); // Exclude terminated employees

    if (roleError) throw roleError;

    // Get users by department
    const { data: deptStats, error: deptError } = await supabaseAdmin
      .from('employees')
      .select(`
        departments(name),
        status
      `)
      .neq('status', 'terminated')
      .not('departments', 'is', null);

    if (deptError) throw deptError;

    // Calculate stats
    const totalUsers = roleStats.length;
    const activeUsers = roleStats.filter(u => u.status === 'active').length;
    const inactiveUsers = totalUsers - activeUsers;

    const roleCounts = roleStats.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const departmentCounts = deptStats.reduce((acc, user) => {
      const deptName = user.departments?.name || 'Chưa phân bổ';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats: UserStats = {
      total_users: totalUsers,
      admin_count: roleCounts.admin || 0,
      hr_count: roleCounts.hr || 0,
      lead_count: roleCounts.lead || 0,
      accountant_count: roleCounts.accountant || 0,
      employee_count: roleCounts.employee || 0,
      active_users: activeUsers,
      inactive_users: inactiveUsers,
      by_department: Object.entries(departmentCounts).map(([name, count]) => ({
        department_name: name,
        count: count
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    return handleError(error);
  }
} 