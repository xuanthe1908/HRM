import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/departments - Lấy danh sách phòng ban
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'departments');
  }
}

// POST /api/departments - Tạo phòng ban mới
export async function POST(req: NextRequest) {
  try {
    await authenticate(req);
    const departmentData = await req.json();

    // Validate input length
    if (departmentData.name && departmentData.name.length > 100) {
      return NextResponse.json({ error: 'Tên phòng ban không được vượt quá 100 ký tự' }, { status: 400 });
    }
    if (departmentData.description && departmentData.description.length > 500) {
      return NextResponse.json({ error: 'Mô tả không được vượt quá 500 ký tự' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert(departmentData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error, 'An internal server error occurred', 'departments');
  }
} 