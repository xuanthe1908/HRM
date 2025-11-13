import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET budgets. Can be filtered by year, month, and quarter.
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const quarter = searchParams.get('quarter');

    let query = supabaseAdmin
      .from('budgets')
      .select(`
        *,
        budget_allocations (
          *,
          budget_categories (id, code, name, level)
        )
      `);

    if (year) {
      query = query.eq('year', year);
    }
    if (month) {
      query = query.eq('period_value', month).eq('period_type', 'month');
    } else if (quarter) {
      query = query.eq('period_value', quarter).eq('period_type', 'quarter');
    }
    
    // If filtering by a specific period, we expect a single result.
    if ((year && month) || (year && quarter)) {
      const { data, error } = await query.single();
       if (error && error.code !== 'PGRST116') { // PGRST116 is 'single row not found'
        throw error;
      }
      return NextResponse.json(data);
    } else {
      const { data, error } = await query
        .order('year', { ascending: false })
        .order('period_value', { ascending: false });
      
      if (error) throw error;
      return NextResponse.json(data);
    }

  } catch (error) {
    return handleError(error);
  }
}

// POST a new budget with its allocations
export async function POST(req: NextRequest) {
  try {
    await authenticate(req);
    const { budgetData, allocationsData } = await req.json();

    // Insert the main budget record
    const { data: newBudget, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .insert(budgetData)
      .select()
      .single();

    if (budgetError) {
      // Log lỗi để debug
      console.error('Budget creation error:', budgetError);
      throw budgetError;
    }

    // Prepare and insert the allocation records
    if (allocationsData && allocationsData.length > 0) {
      const allocationsToInsert = allocationsData.map((alloc: any) => ({
        budget_id: newBudget.id,
        category_id: alloc.categoryId,
        allocated_amount: alloc.allocatedAmount,
      }));

      const { error: allocationsError } = await supabaseAdmin
        .from('budget_allocations')
        .insert(allocationsToInsert);

      if (allocationsError) throw allocationsError;
    }

    // Return the newly created budget with its allocations
    const { data: createdBudgetWithAllocations, error: finalError } = await supabaseAdmin
        .from('budgets')
        .select(`*, budget_allocations(*)`)
        .eq('id', newBudget.id)
        .single();
    
    if (finalError) throw finalError;

    return NextResponse.json(createdBudgetWithAllocations, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
} 