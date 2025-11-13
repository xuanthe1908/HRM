import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budget_id');
    const categoryId = searchParams.get('category_id');

    let query = supabaseAdmin
      .from('budget_allocations')
      .select(`
        *,
        budget_categories (
          id,
          code,
          name,
          category_type,
          level,
          parent_id
        )
      `)
      .order('created_at', { ascending: false });

    if (budgetId) {
      query = query.eq('budget_id', budgetId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching budget allocations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch budget allocations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/budget-allocations:', error);
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);

    const body = await request.json();
    const { budget_id, category_id, allocated_amount, notes } = body;

    // Validate required fields
    if (!budget_id || !category_id || allocated_amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: budget_id, category_id, allocated_amount' },
        { status: 400 }
      );
    }

    // Validate allocated_amount
    if (typeof allocated_amount !== 'number' || allocated_amount < 0) {
      return NextResponse.json(
        { error: 'allocated_amount must be a non-negative number' },
        { status: 400 }
      );
    }

    // Check if budget exists
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('id')
      .eq('id', budget_id)
      .single();

    if (budgetError) {
      return NextResponse.json(
        { error: 'Invalid budget_id' },
        { status: 400 }
      );
    }

    // Check if category exists
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('budget_categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (categoryError) {
      return NextResponse.json(
        { error: 'Invalid category_id' },
        { status: 400 }
      );
    }

    // Insert new allocation
    const { data, error } = await supabaseAdmin
      .from('budget_allocations')
      .insert([{
        budget_id,
        category_id,
        allocated_amount,
        spent_amount: 0,
        notes: notes || null
      }])
      .select(`
        *,
        budget_categories (
          id,
          code,
          name,
          category_type,
          level,
          parent_id
        )
      `)
      .single();

    if (error) {
      console.error('Error creating budget allocation:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Phân bổ ngân sách cho danh mục này đã tồn tại' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create budget allocation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/budget-allocations:', error);
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await authenticate(request);

    const body = await request.json();
    const { allocations } = body; // Array of allocation updates

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: 'allocations must be a non-empty array' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const allocation of allocations) {
      const { id, allocated_amount, notes } = allocation;

      if (!id || allocated_amount === undefined) {
        errors.push({ id, error: 'Missing required fields: id, allocated_amount' });
        continue;
      }

      if (typeof allocated_amount !== 'number' || allocated_amount < 0) {
        errors.push({ id, error: 'allocated_amount must be a non-negative number' });
        continue;
      }

      try {
        const { data, error } = await supabaseAdmin
          .from('budget_allocations')
          .update({
            allocated_amount,
            notes: notes || null
          })
          .eq('id', id)
          .select(`
            *,
            budget_categories (
              id,
              code,
              name,
              category_type,
              level,
              parent_id
            )
          `)
          .single();

        if (error) {
          errors.push({ id, error: error.message });
        } else {
          results.push(data);
        }
      } catch (err) {
        errors.push({ id, error: 'Unexpected error' });
      }
    }

    return NextResponse.json({ 
      data: results, 
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (error) {
    console.error('Error in PUT /api/budget-allocations:', error);
    return handleError(error);
  }
}
