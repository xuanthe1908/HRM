import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/test-2fa - Test 2FA database connection
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    console.log('Testing 2FA database connection...');
    
    // Test 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_2fa_factors', 'user_2fa_challenges']);

    console.log('Tables check:', { tables, tablesError });

    // Test 2: Try to insert a test factor
    const testFactor = {
      user_id: '00000000-0000-0000-0000-000000000001',
      friendly_name: 'Test 2FA',
      factor_type: 'totp',
      status: 'unverified'
    };

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('user_2fa_factors')
      .insert(testFactor)
      .select()
      .single();

    console.log('Insert test:', { insertResult, insertError });

    // Test 3: Try to select from table
    const { data: selectResult, error: selectError } = await supabaseAdmin
      .from('user_2fa_factors')
      .select('*')
      .limit(1);

    console.log('Select test:', { selectResult, selectError });

    return NextResponse.json({
      success: true,
      tests: {
        tables: { data: tables, error: tablesError },
        insert: { data: insertResult, error: insertError },
        select: { data: selectResult, error: selectError }
      }
    });
  } catch (error) {
    console.error('Test 2FA error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 