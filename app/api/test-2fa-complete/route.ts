import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import speakeasy from 'speakeasy';

// GET /api/test-2fa-complete - Test complete 2FA functionality
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    console.log('Testing complete 2FA functionality...');
    
    // Test 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_2fa_factors', 'user_2fa_challenges', 'user_2fa_attempts']);

    console.log('Tables check:', { tables, tablesError });

    // Test 2: Get current user
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role, email')
      .eq('auth_user_id', userId)
      .single();

    console.log('User check:', { currentUser, userError });

    // Test 3: Generate test secret
    const secretObj = speakeasy.generateSecret({
      name: currentUser?.email || 'test@example.com',
      issuer: 'HRM System',
      length: 32
    });
    const secret = secretObj.base32;
    const qrCode = secretObj.otpauth_url;

    // Test 4: Generate current TOTP
    const currentTotp = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });

    // Test 5: Verify TOTP
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: currentTotp,
      window: 1
    });

    // Test 6: Try to insert a test factor
    const testFactor = {
      user_id: currentUser?.id || '00000000-0000-0000-0000-000000000001',
      friendly_name: 'Test 2FA Factor',
      factor_type: 'totp',
      status: 'unverified',
      secret: secret
    };

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('user_2fa_factors')
      .insert(testFactor)
      .select()
      .single();

    console.log('Insert test:', { insertResult, insertError });

    // Test 7: Try to select from table
    const { data: selectResult, error: selectError } = await supabaseAdmin
      .from('user_2fa_factors')
      .select('*')
      .eq('user_id', currentUser?.id)
      .limit(5);

    console.log('Select test:', { selectResult, selectError });

    // Test 8: Test log function
    let logResult = null;
    let logError = null;
    try {
      const { data, error } = await supabaseAdmin.rpc('log_2fa_attempt', {
        p_user_id: currentUser?.id || '00000000-0000-0000-0000-000000000001',
        p_attempt_type: 'setup',
        p_success: true,
        p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
        p_user_agent: req.headers.get('user-agent')
      });
      logResult = data;
      logError = error;
    } catch (error) {
      logError = error;
    }

    console.log('Log function test:', { logResult, logError });

    return NextResponse.json({
      success: true,
      tests: {
        tables: { data: tables, error: tablesError },
        user: { data: currentUser, error: userError },
        secret: { secret, qrCode, currentTotp, isValid },
        insert: { data: insertResult, error: insertError },
        select: { data: selectResult, error: selectError },
        log: { data: logResult, error: logError }
      },
      summary: {
        tablesExist: !tablesError && tables?.length === 3,
        userFound: !userError && currentUser,
        totpWorking: isValid,
        databaseWorking: !insertError && !selectError,
        loggingWorking: !logError
      }
    });
  } catch (error) {
    console.error('Test 2FA complete error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 