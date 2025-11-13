import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET a single financial target by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticate(req);
    const { id } = params;
    const { data, error } = await supabaseAdmin
      .from('financial_targets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch(error) {
    return handleError(error);
  }
}

// UPDATE a financial target by ID
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticate(req);
    const { id } = params;
    const updatedData = await req.json();

    if (!updatedData) {
        return NextResponse.json({ error: 'Target data is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('financial_targets')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch(error) {
    return handleError(error);
  }
}


// DELETE a financial target by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticate(req);
    const { id } = params;
    
    const { error } = await supabaseAdmin
      .from('financial_targets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Financial target deleted successfully' });
  } catch(error) {
    return handleError(error);
  }
} 