import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/attendance - Lấy danh sách chấm công
export async function GET(req: NextRequest) {
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    // TODO: Thêm logic phân trang và lọc ở đây
    const { data, error } = await supabaseAdmin.from('attendance_records').select('*');
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/attendance - Tạo bản ghi chấm công mới
export async function POST(req: NextRequest) {
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    const attendanceData = await req.json();
    console.log('🔍 POST /api/attendance - attendanceData:', attendanceData);

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .insert(attendanceData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('✅ Created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('💥 POST error:', error);
    return handleError(error);
  }
} 