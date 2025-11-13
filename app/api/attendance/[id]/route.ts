import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// Check if we're in build mode and skip execution
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV;

// GET /api/attendance/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  
  // Skip execution during build time
  if (isBuildTime) {
    return NextResponse.json({ message: 'Build time - skipping execution' }, { status: 200 });
  }
  
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    const { data, error } = await supabaseAdmin.from('attendance_records').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/attendance/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  
  // Skip execution during build time
  if (isBuildTime) {
    return NextResponse.json({ message: 'Build time - skipping execution' }, { status: 200 });
  }
  
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    const attendanceData = await req.json();
    console.log('🔍 PUT /api/attendance/[id] - attendanceData:', attendanceData);
    delete attendanceData.id;

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .update(attendanceData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    console.log('✅ Updated successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 PUT error:', error);
    return handleError(error);
  }
}

// DELETE /api/attendance/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  
  // Skip execution during build time
  if (isBuildTime) {
    return NextResponse.json({ message: 'Build time - skipping execution' }, { status: 200 });
  }
  
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    const { error } = await supabaseAdmin.from('attendance_records').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: 'Attendance record deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
} 