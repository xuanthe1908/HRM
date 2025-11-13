import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/departments/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const { data, error } = await supabaseAdmin.from('departments').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'departments');
  }
}

// PUT /api/departments/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const departmentData = await req.json();
    delete departmentData.id;

    // Validate input length
    if (departmentData.name && departmentData.name.length > 100) {
      return NextResponse.json({ error: 'Tên phòng ban không được vượt quá 100 ký tự' }, { status: 400 });
    }
    if (departmentData.description && departmentData.description.length > 500) {
      return NextResponse.json({ error: 'Mô tả không được vượt quá 500 ký tự' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(departmentData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'departments');
  }
}

// DELETE /api/departments/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const { error } = await supabaseAdmin.from('departments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: 'Department deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'departments');
  }
} 