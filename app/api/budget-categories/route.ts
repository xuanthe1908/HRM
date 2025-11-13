import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);

    const { searchParams } = new URL(request.url);
    const categoryType = searchParams.get('type'); // 1=chi phí, 2=doanh thu
    const parentId = searchParams.get('parent_id');
    const includeTree = searchParams.get('tree') === 'true';

    if (includeTree) {
      // Try using function, fallback to normal query if function doesn't exist
      let data, error;
      
      try {
        const result = await supabaseAdmin
          .rpc('get_budget_category_tree', {
            category_type_filter: categoryType ? parseInt(categoryType) : null
          });
        data = result.data;
        error = result.error;
      } catch (funcError) {
        console.warn('Tree function not available, using fallback:', funcError);
        // Fallback to normal query
        const fallbackResult = await supabaseAdmin
          .from('budget_categories')
          .select('*')
          .eq('is_active', true)
          .order('level', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('code', { ascending: true });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Error fetching budget categories:', error);
        return NextResponse.json(
          { error: 'Failed to fetch budget categories' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    } else {
      // Lấy danh sách thông thường
      let query = supabaseAdmin
        .from('budget_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });

      if (categoryType) {
        query = query.eq('category_type', parseInt(categoryType));
      }

      if (parentId) {
        if (parentId === 'null') {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', parentId);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budget categories:', error);
        return NextResponse.json(
          { error: 'Failed to fetch budget categories' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('Error in GET /api/budget-categories:', error);
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);

    const body = await request.json();
    const { code, name, parent_id, category_type, description, sort_order } = body;

    // Validate required fields
    if (!code || !name || !category_type) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, category_type' },
        { status: 400 }
      );
    }

    // Validate category_type
    if (![1, 2].includes(category_type)) {
      return NextResponse.json(
        { error: 'category_type must be 1 (chi phí) or 2 (doanh thu)' },
        { status: 400 }
      );
    }

    // Determine level
    let level = 1;
    if (parent_id) {
      const { data: parentCategory, error: parentError } = await supabaseAdmin
        .from('budget_categories')
        .select('level')
        .eq('id', parent_id)
        .single();

      if (parentError) {
        return NextResponse.json(
          { error: 'Invalid parent_id' },
          { status: 400 }
        );
      }

      level = parentCategory.level + 1;
    }

    // Insert new category
    const { data, error } = await supabaseAdmin
      .from('budget_categories')
      .insert([{
        code,
        name,
        parent_id: parent_id || null,
        level,
        category_type,
        description: description || null,
        sort_order: sort_order || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating budget category:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Mã danh mục đã tồn tại' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create budget category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/budget-categories:', error);
    return handleError(error);
  }
}
