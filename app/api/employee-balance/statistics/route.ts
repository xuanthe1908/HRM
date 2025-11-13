import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, handleError } from '@/lib/supabase-server';
import { EmployeeBalanceService } from '@/lib/employee-balance-service';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const userId = await authenticate(req);
    
    // This is statistics endpoint - only admin/hr can access
    // We could add role check here if needed, but for now allow all authenticated users
    
    const statistics = await EmployeeBalanceService.getBalanceStatistics();
    
    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error getting balance statistics:', error);
    return handleError(error);
  }
}
