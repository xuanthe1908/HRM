import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    
    const { data, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
} 