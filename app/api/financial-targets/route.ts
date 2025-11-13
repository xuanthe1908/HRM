import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET all financial targets
export async function GET(req: NextRequest) {
  try {
    // Xác thực người dùng nếu cần, hoặc cho phép truy cập công khai
    // await authenticate(req); 
    
    const { data, error } = await supabaseAdmin
      .from('financial_targets')
      .select('*')
      .order('year', { ascending: false })
      .order('period_value', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// POST a new financial target
export async function POST(req: NextRequest) {
  try {
    await authenticate(req);
    const targetData = await req.json();

    const { data, error } = await supabaseAdmin
      .from('financial_targets')
      .insert(targetData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
} 