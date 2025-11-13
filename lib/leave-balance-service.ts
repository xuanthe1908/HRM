import { supabaseAdmin } from './supabase-server';

export interface LeaveBalanceCalculation {
  employee_id: string;
  employee_name: string;
  official_start_date: string | null;
  current_date: string;
  total_earned_days: number;
  total_used_days: number;
  remaining_days: number;
  months_worked: number;
  next_earning_date: string | null;
}

export class LeaveBalanceService {
  /**
   * Tính toán số ngày nghỉ phép dựa trên ngày bắt đầu chính thức
   * Logic: 1 ngày nghỉ phép mỗi tháng
   * - Nếu bắt đầu ngày 1: có ngay 1 ngày
   * - Nếu bắt đầu giữa tháng: chờ đến đầu tháng tiếp theo
   */
  static calculateLeaveBalance(
    officialStartDate: Date,
    currentDate: Date = new Date()
  ): {
    totalEarnedDays: number;
    monthsWorked: number;
    nextEarningDate: Date | null;
  } {
    if (!officialStartDate) {
      return {
        totalEarnedDays: 0,
        monthsWorked: 0,
        nextEarningDate: null
      };
    }

    const startDate = new Date(officialStartDate);
    const today = new Date(currentDate);

    if (today < startDate) {
      // Calculate first earning date (1st of next month after start)
      const firstEarningDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        1
      );
      
      return {
        totalEarnedDays: 0,
        monthsWorked: 0,
        nextEarningDate: firstEarningDate
      };
    }

    let earnedDays = 0;
    let monthsWorked = 0;
    let nextEarningDate: Date | null = null;

    // Nếu bắt đầu từ ngày 1 của tháng, có ngay 1 ngày nghỉ phép
    if (startDate.getDate() === 1) {
      // Tính số tháng từ tháng bắt đầu đến hiện tại
      const currentMonth = today.getFullYear() * 12 + today.getMonth();
      const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
      
      const totalMonths = currentMonth - startMonth + 1;
      earnedDays = totalMonths;
      monthsWorked = totalMonths;
      
      // Ngày earning tiếp theo là ngày 1 của tháng sau
      nextEarningDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    } else {
      // Nếu bắt đầu giữa tháng, phải chờ đến đầu tháng tiếp theo
      const firstEarningDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        1
      );

      if (today >= firstEarningDate) {
        // Tính số tháng từ ngày earning đầu tiên đến hiện tại
        const currentMonth = today.getFullYear() * 12 + today.getMonth();
        const firstEarningMonth = firstEarningDate.getFullYear() * 12 + firstEarningDate.getMonth();
        
        earnedDays = currentMonth - firstEarningMonth + 1;
        monthsWorked = earnedDays;
        
        // Ngày earning tiếp theo là ngày 1 của tháng sau
        nextEarningDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      } else {
        // Chưa đến ngày earning đầu tiên
        earnedDays = 0;
        monthsWorked = 0;
        nextEarningDate = firstEarningDate;
      }
    }

    return {
      totalEarnedDays: Math.max(0, earnedDays),
      monthsWorked: Math.max(0, monthsWorked),
      nextEarningDate
    };
  }

  /**
   * Lấy thông tin số dư nghỉ phép của nhân viên
   */
  static async getEmployeeLeaveBalance(employeeId: string): Promise<LeaveBalanceCalculation | null> {
    try {
      // Lấy thông tin nhân viên
      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id, name, official_start_date')
        .eq('id', employeeId)
        .single();

      if (employeeError || !employee) {
        console.error('Không tìm thấy nhân viên:', employeeError);
        return null;
      }

      const currentYear = new Date().getFullYear();
      const currentDate = new Date();

      // Lấy hoặc tạo leave_balances record cho năm hiện tại
      let { data: leaveBalance, error: balanceError } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', currentYear)
        .single();

      // Nếu chưa có record, tạo mới với giá trị mặc định
      if (!leaveBalance && !balanceError) {
        const { data: newBalance, error: createError } = await supabaseAdmin
          .from('leave_balances')
          .insert({
            employee_id: employeeId,
            year: currentYear,
            annual_leave_total: 12,
            annual_leave_used: 0,
            sick_leave_total: 0, // Chưa có quy chế
            sick_leave_used: 0,
            personal_leave_total: 0, // Chưa có quy chế
            personal_leave_used: 0,
            maternity_leave_total: 0, // Chưa có quy chế
            maternity_leave_used: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Lỗi khi tạo leave balance:', createError);
          return null;
        }
        leaveBalance = newBalance;
      } else if (balanceError) {
        console.error('Lỗi khi lấy leave balance:', balanceError);
        return null;
      }

      // Tính toán số ngày nghỉ phép năm dựa trên thời gian làm việc
      const officialStartDate = employee.official_start_date 
        ? new Date(employee.official_start_date) 
        : null;

      if (!officialStartDate) {
        return {
          employee_id: employee.id,
          employee_name: employee.name,
          official_start_date: null,
          current_date: currentDate.toISOString().split('T')[0],
          total_earned_days: 0,
          total_used_days: leaveBalance?.annual_leave_used || 0,
          remaining_days: 0,
          months_worked: 0,
          next_earning_date: null
        };
      }

      const calculation = this.calculateLeaveBalance(officialStartDate, currentDate);

      // Cập nhật annual_leave_total dựa trên thời gian làm việc (tối đa 12 ngày/năm)
      const actualAnnualTotal = Math.min(calculation.totalEarnedDays, 12);
      const actualAnnualUsed = leaveBalance?.annual_leave_used || 0;
      const actualAnnualRemaining = Math.max(0, actualAnnualTotal - actualAnnualUsed);

      // Cập nhật leave_balances nếu có thay đổi
      if (leaveBalance && leaveBalance.annual_leave_total !== actualAnnualTotal) {
        await supabaseAdmin
          .from('leave_balances')
          .update({ annual_leave_total: actualAnnualTotal })
          .eq('id', leaveBalance.id);
      }

      // Xử lý múi giờ cho next_earning_date
      let nextEarningDateStr: string | null = null;
      if (calculation.nextEarningDate) {
        // Chuyển về múi giờ Việt Nam (UTC+7)
        const vietnamDate = new Date(calculation.nextEarningDate.getTime() + (7 * 60 * 60 * 1000));
        nextEarningDateStr = vietnamDate.toISOString().split('T')[0];
      }

      return {
        employee_id: employee.id,
        employee_name: employee.name,
        official_start_date: employee.official_start_date,
        current_date: currentDate.toISOString().split('T')[0],
        total_earned_days: actualAnnualTotal,
        total_used_days: actualAnnualUsed,
        remaining_days: actualAnnualRemaining,
        months_worked: calculation.monthsWorked,
        next_earning_date: nextEarningDateStr
      };
    } catch (error) {
      console.error('Lỗi khi tính toán số dư nghỉ phép:', error);
      return null;
    }
  }

  /**
   * Cập nhật số ngày nghỉ phép đã sử dụng
   */
  static async updateUsedLeaveDays(employeeId: string): Promise<boolean> {
    try {
      const currentYear = new Date().getFullYear();

      // Lấy leave_balances record
      const { data: leaveBalance, error: balanceError } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', currentYear)
        .single();

      if (balanceError) {
        console.error('Lỗi khi lấy leave balance:', balanceError);
        return false;
      }

      // Tính tổng số ngày nghỉ đã được duyệt theo loại
      const { data: approvedLeaves, error } = await supabaseAdmin
        .from('leave_requests')
        .select('total_days, leave_type')
        .eq('employee_id', employeeId)
        .eq('status', 'approved');

      if (error) {
        console.error('Lỗi khi lấy leave requests:', error);
        return false;
      }

      let annualUsed = 0;
      let sickUsed = 0;
      let personalUsed = 0;
      let maternityUsed = 0;

      if (approvedLeaves) {
        approvedLeaves.forEach(leave => {
          const days = parseFloat(leave.total_days) || 0;
          switch (leave.leave_type) {
            case 'annual_leave': annualUsed += days; break;
            case 'sick_leave': sickUsed += days; break;
            case 'personal_leave': personalUsed += days; break;
            case 'maternity_leave': maternityUsed += days; break;
            default: annualUsed += days; // Default to annual leave
          }
        });
      }

      if (leaveBalance) {
        const { error: updateError } = await supabaseAdmin
          .from('leave_balances')
          .update({
            annual_leave_used: annualUsed,
            sick_leave_used: sickUsed,
            personal_leave_used: personalUsed,
            maternity_leave_used: maternityUsed
          })
          .eq('id', leaveBalance.id);

        if (updateError) {
          console.error('Lỗi khi cập nhật leave balance:', updateError);
          return false;
        }
      } else {
        // Create new record if not found
        const { error: createError } = await supabaseAdmin
          .from('leave_balances')
          .insert({
            employee_id: employeeId,
            year: currentYear,
            annual_leave_total: 12, // Default annual total
            annual_leave_used: annualUsed,
            sick_leave_total: 0, sick_leave_used: sickUsed,
            personal_leave_total: 0, personal_leave_used: personalUsed,
            maternity_leave_total: 0, maternity_leave_used: maternityUsed
          });

        if (createError) {
          console.error('Lỗi khi tạo leave balance:', createError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Lỗi khi cập nhật số ngày nghỉ đã sử dụng:', error);
      return false;
    }
  }

  /**
   * Kiểm tra khả năng xin nghỉ phép
   */
  static async canRequestLeave(
    employeeId: string, 
    requestedDays: number
  ): Promise<{ canRequest: boolean; remainingDays: number; message: string }> {
    try {
      const balance = await this.getEmployeeLeaveBalance(employeeId);
      
      if (!balance) {
        return {
          canRequest: false,
          remainingDays: 0,
          message: 'Không thể tính toán số dư nghỉ phép'
        };
      }

      if (balance.remaining_days >= requestedDays) {
        return {
          canRequest: true,
          remainingDays: balance.remaining_days,
          message: `Có thể xin nghỉ ${requestedDays} ngày. Còn lại ${balance.remaining_days - requestedDays} ngày`
        };
      } else {
        return {
          canRequest: false,
          remainingDays: balance.remaining_days,
          message: `Không đủ ngày nghỉ phép. Cần ${requestedDays} ngày nhưng chỉ còn ${balance.remaining_days} ngày`
        };
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra khả năng xin nghỉ:', error);
      return {
        canRequest: false,
        remainingDays: 0,
        message: 'Lỗi khi kiểm tra khả năng xin nghỉ'
      };
    }
  }
} 