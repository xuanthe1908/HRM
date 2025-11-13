import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/positions/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const { data, error } = await supabaseAdmin.from('positions').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Position not found' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'positions');
  }
}

// PUT /api/positions/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const positionData = await req.json();
    delete positionData.id;

    // Validate input length
    if (positionData.name && positionData.name.length > 100) {
      return NextResponse.json({ error: 'Tên chức vụ không được vượt quá 100 ký tự' }, { status: 400 });
    }
    if (positionData.description && positionData.description.length > 500) {
      return NextResponse.json({ error: 'Mô tả không được vượt quá 500 ký tự' }, { status: 400 });
    }

    // Check for duplicate position name (excluding current position)
    if (positionData.name) {
      const { data: existingPosition } = await supabaseAdmin
        .from('positions')
        .select('id')
        .eq('name', positionData.name)
        .neq('id', id)
        .single();

      if (existingPosition) {
        return NextResponse.json({ error: 'Tên chức vụ đã tồn tại trong hệ thống' }, { status: 409 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('positions')
      .update(positionData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'positions');
  }
}

// DELETE /api/positions/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const { error } = await supabaseAdmin.from('positions').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: 'Position deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'positions');
  }
}