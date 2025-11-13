import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/debug-2fa-secret - Debug 2FA database schema
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    console.log('Debugging 2FA database schema...');
    
    // Test 1: Check if table exists
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_2fa_factors')
      .single();

    console.log('Table exists check:', { tableExists, tableError });

    // Test 2: Check table structure
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_2fa_factors')
      .order('ordinal_position');

    console.log('Table structure:', { columns, columnsError });

    // Test 3: Try to select from table
    const { data: selectResult, error: selectError } = await supabaseAdmin
      .from('user_2fa_factors')
      .select('*')
      .limit(1);

    console.log('Select test:', { selectResult, selectError });

    // Test 4: Try to insert with secret
    const testInsert = {
      user_id: '00000000-0000-0000-0000-000000000001',
      friendly_name: 'Debug Test',
      factor_type: 'totp',
      status: 'unverified',
      secret: 'JBSWY3DPEHPK3PXP'
    };

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('user_2fa_factors')
      .insert(testInsert)
      .select()
      .single();

    console.log('Insert test:', { insertResult, insertError });

    // Test 5: Check if we can update
    if (insertResult) {
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('user_2fa_factors')
        .update({ status: 'verified' })
        .eq('id', insertResult.id)
        .select()
        .single();

      console.log('Update test:', { updateResult, updateError });

      // Clean up test data
      await supabaseAdmin
        .from('user_2fa_factors')
        .delete()
        .eq('id', insertResult.id);
    }

    return NextResponse.json({
      success: true,
      debug: {
        tableExists: !!tableExists,
        tableError,
        columns,
        columnsError,
        selectResult,
        selectError,
        insertResult,
        insertError
      },
      summary: {
        tableExists: !!tableExists,
        hasSecretColumn: columns?.some(col => col.column_name === 'secret'),
        canSelect: !selectError,
        canInsert: !insertError
      }
    });
  } catch (error) {
    console.error('Debug 2FA error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/debug-2fa-secret - Fix 2FA database schema
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    console.log('Fixing 2FA database schema...');
    
    // Step 1: Drop existing table if it exists
    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS user_2fa_factors CASCADE;'
    });

    console.log('Drop table result:', { dropError });

    // Step 2: Create table with correct schema
    const createTableSQL = `
      CREATE TABLE user_2fa_factors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        friendly_name TEXT NOT NULL,
        factor_type TEXT NOT NULL DEFAULT 'totp',
        status TEXT NOT NULL DEFAULT 'unverified',
        secret TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: createTableSQL
    });

    console.log('Create table result:', { createError });

    // Step 3: Grant permissions
    const { error: grantError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'GRANT ALL ON user_2fa_factors TO authenticated;'
    });

    console.log('Grant permissions result:', { grantError });

    // Step 4: Create indexes
    const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_2fa_factors_user_id ON user_2fa_factors(user_id);'
    });

    console.log('Create index result:', { indexError });

    // Step 5: Test the fix
    const testInsert = {
      user_id: '00000000-0000-0000-0000-000000000001',
      friendly_name: 'Test After Fix',
      factor_type: 'totp',
      status: 'unverified',
      secret: 'JBSWY3DPEHPK3PXP'
    };

    const { data: testResult, error: testError } = await supabaseAdmin
      .from('user_2fa_factors')
      .insert(testInsert)
      .select()
      .single();

    console.log('Test after fix:', { testResult, testError });

    // Clean up test data
    if (testResult) {
      await supabaseAdmin
        .from('user_2fa_factors')
        .delete()
        .eq('id', testResult.id);
    }

    return NextResponse.json({
      success: true,
      fix: {
        dropError,
        createError,
        grantError,
        indexError,
        testResult,
        testError
      },
      summary: {
        tableDropped: !dropError,
        tableCreated: !createError,
        permissionsGranted: !grantError,
        indexCreated: !indexError,
        testPassed: !testError
      }
    });
  } catch (error) {
    console.error('Fix 2FA error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 