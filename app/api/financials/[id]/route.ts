import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/financials/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);
    const { status } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('financial_transactions')
      .update({ status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
       if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/financials/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    await authenticate(req);

    const { error } = await supabaseAdmin
      .from('financial_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
