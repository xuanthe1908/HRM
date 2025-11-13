import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);

    const body = await request.json();
    const { expense_request_id, budget_category_id } = body;

    if (!expense_request_id) {
      return NextResponse.json(
        { error: 'expense_request_id is required' },
        { status: 400 }
      );
    }

    // Lấy thông tin expense request
    const { data: expenseRequest, error: expenseError } = await supabaseAdmin
      .from('expense_requests')
      .select(`
        *,
        employee:employees(id, name, employee_code)
      `)
      .eq('id', expense_request_id)
      .eq('status', 'approved')
      .single();

    if (expenseError || !expenseRequest) {
      return NextResponse.json(
        { error: 'Expense request not found or not approved' },
        { status: 404 }
      );
    }

    // Kiểm tra xem đã tạo financial transaction chưa
    const { data: existingTransaction, error: checkError } = await supabaseAdmin
      .from('financial_transactions')
      .select('id')
      .eq('reference_type', 'expense_request')
      .eq('reference_id', expense_request_id)
      .single();

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Financial transaction already exists for this expense request' },
        { status: 409 }
      );
    }

    // Tạo financial transaction
    const transactionData = {
      type: 'expense',
      category_id: null, // Sẽ mapping với budget category thay vì financial category cũ
      description: `Chi phí từ yêu cầu: ${expenseRequest.description}`,
      amount: expenseRequest.amount,
      date: expenseRequest.date,
      account_type: 'company', // Mặc định là tài khoản công ty
      status: 'approved', // Tự động approved vì expense đã được duyệt
      notes: `Tự động tạo từ yêu cầu chi phí #${expenseRequest.id} của ${expenseRequest.employee?.name}`,
      reference_type: 'expense_request',
      reference_id: expense_request_id
    };

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('financial_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating financial transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create financial transaction' },
        { status: 500 }
      );
    }

    // Nếu có budget_category_id, tạo mapping
    if (budget_category_id) {
      const { error: mappingError } = await supabaseAdmin
        .from('expense_budget_mapping')
        .insert([{
          expense_request_id,
          budget_category_id,
          amount: expenseRequest.amount
        }]);

      if (mappingError) {
        console.error('Error creating expense budget mapping:', mappingError);
        // Không return error ở đây vì transaction đã được tạo thành công
      }
    }

    return NextResponse.json({ 
      data: {
        transaction,
        expense_request: expenseRequest,
        message: 'Successfully integrated expense with financial system'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/expenses/integrate-financial:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const expenseRequestId = searchParams.get('expense_request_id');

    if (!expenseRequestId) {
      return NextResponse.json(
        { error: 'expense_request_id is required' },
        { status: 400 }
      );
    }

    // Kiểm tra xem expense request đã được tích hợp với financial chưa
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('financial_transactions')
      .select(`
        *,
        expense_budget_mapping (
          budget_category_id,
          budget_categories (
            id,
            code,
            name,
            category_type
          )
        )
      `)
      .eq('reference_type', 'expense_request')
      .eq('reference_id', expenseRequestId)
      .single();

    if (transactionError && transactionError.code !== 'PGRST116') {
      console.error('Error checking financial transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to check financial transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        is_integrated: !!transaction,
        transaction: transaction || null
      }
    });

  } catch (error) {
    console.error('Error in GET /api/expenses/integrate-financial:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
