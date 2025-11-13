import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticate(request);

    const { data, error } = await supabaseAdmin
      .from('budget_categories')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Budget category not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching budget category:', error);
      return NextResponse.json(
        { error: 'Failed to fetch budget category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/budget-categories/[id]:', error);
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticate(request);

    const body = await request.json();
    const { name, description, sort_order, is_active } = body;

    // Note: code, parent_id, level, category_type không được phép thay đổi để tránh ảnh hưởng đến cấu trúc
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('budget_categories')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating budget category:', error);
      return NextResponse.json(
        { error: 'Failed to update budget category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PUT /api/budget-categories/[id]:', error);
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticate(request);

    // Kiểm tra xem có danh mục con không
    const { data: children, error: childrenError } = await supabaseAdmin
      .from('budget_categories')
      .select('id')
      .eq('parent_id', params.id)
      .limit(1);

    if (childrenError) {
      console.error('Error checking children:', childrenError);
      return NextResponse.json(
        { error: 'Failed to check child categories' },
        { status: 500 }
      );
    }

    if (children && children.length > 0) {
      return NextResponse.json(
        { error: 'Không thể xóa danh mục có danh mục con' },
        { status: 400 }
      );
    }

    // Kiểm tra xem có budget allocation nào sử dụng không
    const { data: allocations, error: allocationsError } = await supabaseAdmin
      .from('budget_allocations')
      .select('id')
      .eq('category_id', params.id)
      .limit(1);

    if (allocationsError) {
      console.error('Error checking allocations:', allocationsError);
      return NextResponse.json(
        { error: 'Failed to check budget allocations' },
        { status: 500 }
      );
    }

    if (allocations && allocations.length > 0) {
      return NextResponse.json(
        { error: 'Không thể xóa danh mục đã được sử dụng trong phân bổ ngân sách' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('budget_categories')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting budget category:', error);
      return NextResponse.json(
        { error: 'Failed to delete budget category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Budget category deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/budget-categories/[id]:', error);
    return handleError(error);
  }
}
