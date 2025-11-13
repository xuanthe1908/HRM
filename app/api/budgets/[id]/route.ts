import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET a single budget by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { data, error } = await supabaseAdmin
    .from('budgets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// UPDATE a budget by ID
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const { budgetData } = await req.json();

    if (!budgetData) {
        return NextResponse.json({ error: 'Budget data is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('budgets')
        .update(budgetData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}


// DELETE a budget by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  const { error } = await supabaseAdmin
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Budget deleted successfully' });
} 