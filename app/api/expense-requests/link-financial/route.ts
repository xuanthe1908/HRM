import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const body = await req.json();
    
    const { expense_request_id, budget_category_id } = body;

    if (!expense_request_id) {
      return NextResponse.json({ error: 'Missing expense_request_id' }, { status: 400 });
    }

    // Lấy thông tin employee
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Associated employee not found for the current user.' }, { status: 404 });
    }

    // Lấy thông tin expense request
    const { data: expenseRequest, error: expenseError } = await supabaseAdmin
      .from('expense_requests')
      .select('*')
      .eq('id', expense_request_id)
      .single();

    if (expenseError || !expenseRequest) {
      return NextResponse.json({ error: 'Expense request not found' }, { status: 404 });
    }

    // Kiểm tra xem expense đã được liên kết chưa
    const { data: existingMapping } = await supabaseAdmin
      .rpc('check_expense_already_mapped', { expense_id: expense_request_id });

    if (existingMapping) {
      return NextResponse.json({ 
        error: 'Expense request has already been mapped to a financial transaction',
        code: 'ALREADY_MAPPED'
      }, { status: 409 });
    }

    // Lấy thông tin budget category nếu có
    let categoryId = null;
    if (budget_category_id) {
      const { data: budgetCategory } = await supabaseAdmin
        .from('budget_categories')
        .select('id, category_type')
        .eq('id', budget_category_id)
        .single();
      
      if (budgetCategory) {
        categoryId = budgetCategory.id;
      }
    }

    // Tạo financial transaction
    const { data: financialTransaction, error: transactionError } = await supabaseAdmin
      .from('financial_transactions')
      .insert({
        type: 'expense', // Expense requests luôn là expense
        category_id: categoryId,
        description: `Chi phí: ${expenseRequest.description}`,
        amount: expenseRequest.amount,
        date: expenseRequest.date,
        account_type: 'company', // Mặc định là tài khoản công ty
        notes: `Tự động tạo từ expense request: ${expenseRequest.id}`,
        status: 'approved', // Tự động approved vì expense đã được approved
        created_by: employee.id
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating financial transaction:', transactionError);
      throw transactionError;
    }

    // Tạo mapping giữa expense request và financial transaction
    const { data: mappingId, error: mappingError } = await supabaseAdmin
      .rpc('create_expense_financial_mapping', {
        p_expense_request_id: expense_request_id,
        p_financial_transaction_id: financialTransaction.id,
        p_budget_category_id: categoryId,
        p_mapped_by: employee.id
      });

    if (mappingError) {
      console.error('Error creating mapping:', mappingError);
      // Nếu tạo mapping thất bại, xóa financial transaction đã tạo
      await supabaseAdmin
        .from('financial_transactions')
        .delete()
        .eq('id', financialTransaction.id);
      throw mappingError;
    }

    // Lấy thông tin mapping đầy đủ
    const { data: mappingInfo } = await supabaseAdmin
      .rpc('get_expense_financial_mapping', { expense_id: expense_request_id });

    return NextResponse.json({
      success: true,
      message: 'Expense request successfully linked to financial transaction',
      financial_transaction: financialTransaction,
      mapping: mappingInfo && mappingInfo.length > 0 ? mappingInfo[0] : null
    }, { status: 201 });

  } catch (error) {
    console.error('Error linking expense to financial:', error);
    return handleError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    const { searchParams } = new URL(req.url);
    const expense_id = searchParams.get('expense_id');

    if (!expense_id) {
      return NextResponse.json({ error: 'Missing expense_id parameter' }, { status: 400 });
    }

    // Lấy thông tin mapping
    const { data: mappingInfo, error } = await supabaseAdmin
      .rpc('get_expense_financial_mapping', { expense_id });

    if (error) {
      console.error('Error getting mapping info:', error);
      throw error;
    }

    return NextResponse.json({
      is_mapped: mappingInfo && mappingInfo.length > 0,
      mapping_info: mappingInfo && mappingInfo.length > 0 ? mappingInfo[0] : null
    });

  } catch (error) {
    console.error('Error getting mapping info:', error);
    return handleError(error);
  }
}
