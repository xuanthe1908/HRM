import { supabase } from './supabase';

export interface EmployeeBalance {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department_name?: string;
  position_name?: string;
  current_balance: number;
  total_received: number;
  total_spent: number;
  last_updated?: string;
  balance_status?: 'positive' | 'negative' | 'zero';
}

export interface BalanceTransaction {
  id: string;
  transaction_type: 'expense_approved' | 'balance_adjustment' | 'monthly_settlement';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  notes?: string;
  created_at: string;
  created_by_name?: string;
}

export interface BalanceAdjustmentRequest {
  employeeId: string;
  amount: number;
  description: string;
  notes?: string;
  action?: 'adjustment' | 'settlement';
}

export class EmployeeBalanceService {
  // Lấy số dư của một nhân viên
  static async getEmployeeBalance(employeeId: string): Promise<EmployeeBalance | null> {
    try {
      const { data, error } = await supabase
        .from('employee_balance_summary')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching employee balance:', error);
      throw error;
    }
  }

  // Lấy tất cả số dư nhân viên (cho admin/hr)
  static async getAllEmployeeBalances(status?: 'positive' | 'negative' | 'zero'): Promise<EmployeeBalance[]> {
    try {
      let query = supabase
        .from('employee_balance_summary')
        .select('*')
        .order('employee_name');

      if (status) {
        query = query.eq('balance_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all employee balances:', error);
      throw error;
    }
  }

  // Lấy lịch sử giao dịch của nhân viên
  static async getTransactionHistory(
    employeeId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<BalanceTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('employee_balance_transactions')
        .select(`
          id,
          transaction_type,
          amount,
          balance_before,
          balance_after,
          description,
          notes,
          created_at,
          created_by:employees(name)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        created_by_name: item.created_by?.name
      })) || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  // Điều chỉnh số dư nhân viên
  static async adjustBalance(request: BalanceAdjustmentRequest): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('adjust_employee_balance', {
          p_employee_id: request.employeeId,
          p_amount: request.amount,
          p_description: request.description,
          p_notes: request.notes
        });

      if (error) throw error;

      return {
        success: true,
        message: 'Điều chỉnh số dư thành công'
      };
    } catch (error) {
      console.error('Error adjusting balance:', error);
      throw error;
    }
  }

  // Thanh toán cuối tháng
  static async monthlySettlement(
    employeeId: string,
    amount: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('monthly_balance_settlement', {
          p_employee_id: employeeId,
          p_settlement_amount: amount,
          p_notes: notes
        });

      if (error) throw error;

      return {
        success: true,
        message: 'Thanh toán cuối tháng thành công'
      };
    } catch (error) {
      console.error('Error processing monthly settlement:', error);
      throw error;
    }
  }

  // Lấy thống kê tổng hợp
  static async getBalanceStatistics(): Promise<{
    totalEmployees: number;
    positiveBalance: number;
    negativeBalance: number;
    zeroBalance: number;
    totalPositiveAmount: number;
    totalNegativeAmount: number;
  }> {
    try {
      const balances = await this.getAllEmployeeBalances();
      
      const stats = {
        totalEmployees: balances.length,
        positiveBalance: balances.filter(b => b.current_balance > 0).length,
        negativeBalance: balances.filter(b => b.current_balance < 0).length,
        zeroBalance: balances.filter(b => b.current_balance === 0).length,
        totalPositiveAmount: balances
          .filter(b => b.current_balance > 0)
          .reduce((sum, b) => sum + b.current_balance, 0),
        totalNegativeAmount: Math.abs(balances
          .filter(b => b.current_balance < 0)
          .reduce((sum, b) => sum + b.current_balance, 0))
      };

      return stats;
    } catch (error) {
      console.error('Error getting balance statistics:', error);
      throw error;
    }
  }

  // Lấy danh sách nhân viên có số dư âm (cần thanh toán)
  static async getEmployeesWithNegativeBalance(): Promise<EmployeeBalance[]> {
    try {
      const { data, error } = await supabase
        .from('employee_balance_summary')
        .select('*')
        .lt('current_balance', 0)
        .order('current_balance', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching employees with negative balance:', error);
      throw error;
    }
  }

  // Lấy danh sách nhân viên có số dư dương (có thể rút)
  static async getEmployeesWithPositiveBalance(): Promise<EmployeeBalance[]> {
    try {
      const { data, error } = await supabase
        .from('employee_balance_summary')
        .select('*')
        .gt('current_balance', 0)
        .order('current_balance', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching employees with positive balance:', error);
      throw error;
    }
  }

  // Tạo số dư cho nhân viên mới (nếu chưa có)
  static async createBalanceForEmployee(employeeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employee_balances')
        .insert({
          employee_id: employeeId,
          current_balance: 0,
          total_received: 0,
          total_spent: 0
        })
        .select()
        .single();

      // Nếu đã tồn tại, không làm gì
      if (error && error.code !== '23505') { // 23505 là unique constraint violation
        throw error;
      }
    } catch (error) {
      console.error('Error creating balance for employee:', error);
      throw error;
    }
  }
}

