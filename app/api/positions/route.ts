import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/positions - Lấy danh sách chức vụ
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    const { data, error } = await supabaseAdmin
      .from('positions')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'positions');
  }
}

// POST /api/positions - Tạo chức vụ mới
export async function POST(req: NextRequest) {
  try {
    await authenticate(req);
    const positionData = await req.json();

    // Validate input length
    if (positionData.name && positionData.name.length > 100) {
      return NextResponse.json({ error: 'Tên chức vụ không được vượt quá 100 ký tự' }, { status: 400 });
    }
    if (positionData.description && positionData.description.length > 500) {
      return NextResponse.json({ error: 'Mô tả không được vượt quá 500 ký tự' }, { status: 400 });
    }

    // Check for duplicate position name
    const { data: existingPosition } = await supabaseAdmin
      .from('positions')
      .select('id')
      .eq('name', positionData.name)
      .single();

    if (existingPosition) {
      return NextResponse.json({ error: 'Tên chức vụ đã tồn tại trong hệ thống' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('positions')
      .insert(positionData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'positions');
  }
}