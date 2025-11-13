import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    await authenticate(req);

    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('financial_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (transactionsError) throw transactionsError;

    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('budget_categories')
      .select('*')
      .order('code', { ascending: true });

    if (categoriesError) throw categoriesError;

    return NextResponse.json({
      transactions,
      categories,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const body = await req.json();

    // Validate incoming data - accept both 'type' and 'transaction_type'
    const transactionType = body.type || body.transaction_type;
    if (!transactionType || !body.description || !body.amount || !body.date || !body.account_type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Handle category_id - can be null for transactions without budget category
    const categoryId = body.category_id || null;

    // Lấy employee_id từ auth_user_id
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Associated employee not found for the current user.' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('financial_transactions')
      .insert({
        type: transactionType,
        category_id: categoryId,
        description: body.description,
        amount: body.amount,
        date: body.date,
        account_type: body.account_type,
        notes: body.notes,
        status: 'pending', // Mặc định là chờ duyệt
        created_by: employee.id, // Sử dụng employee.id thay vì user.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating financial transaction:', error);
    return handleError(error);
  }
} 