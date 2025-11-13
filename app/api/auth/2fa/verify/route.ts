import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import speakeasy from 'speakeasy';

// POST /api/auth/2fa/verify - Verify TOTP code
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { factorId, code, secret } = await req.json();

    console.log('Verifying TOTP:', { factorId, code, secret });

    if (!factorId || !code || !secret) {
      return NextResponse.json({ error: 'Factor ID, Code, and Secret are required' }, { status: 400 });
    }

    // Lấy thông tin user
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify TOTP code using speakeasy library
    const isValid = verifyTOTPCode(secret, code);

    console.log('TOTP verification result:', isValid);

    if (!isValid) {
      // Log failed attempt
      await supabaseAdmin.rpc('log_2fa_attempt', {
        p_user_id: currentUser.id,
        p_attempt_type: 'verify',
        p_success: false,
        p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
        p_user_agent: req.headers.get('user-agent')
      });

      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
    }

    // Update factor status to verified
    console.log('Updating factor status to verified for factorId:', factorId);
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('user_2fa_factors')
      .update({ 
        status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', factorId)
      .eq('user_id', currentUser.id)
      .select();

    if (updateError) {
      console.error('Error updating factor:', updateError);
      return NextResponse.json({ error: 'Failed to verify 2FA code' }, { status: 500 });
    }

    // Log successful attempt
    await supabaseAdmin.rpc('log_2fa_attempt', {
      p_user_id: currentUser.id,
      p_attempt_type: 'verify',
      p_success: true,
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      p_user_agent: req.headers.get('user-agent')
    });

    console.log('Factor updated successfully:', updateData);

    return NextResponse.json({
      verified: true,
      message: '2FA code verified successfully'
    });
  } catch (error) {
    console.error('Error in verify API:', error);
    return handleError(error);
  }
}

// Proper TOTP verification using speakeasy library
function verifyTOTPCode(secret: string, code: string): boolean {
  try {
    console.log('Verifying with secret:', secret, 'code:', code);
    
    // Generate current TOTP for debugging
    const currentTotp = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
    console.log('Current TOTP:', currentTotp);
    
    // Verify TOTP code using speakeasy
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 1 time step before and after
    });
    
    console.log('Verification result:', verified);
    return verified;
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return false;
  }
} 