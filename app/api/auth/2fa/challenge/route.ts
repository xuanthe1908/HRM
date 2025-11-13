import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// POST /api/auth/2fa/challenge - Tạo challenge cho 2FA
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { factorId } = await req.json();

    if (!factorId) {
      return NextResponse.json({ error: 'Factor ID is required' }, { status: 400 });
    }

    // Tạo challenge mới trong database
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('user_2fa_challenges')
      .insert({
        factor_id: factorId,
        otp_code: otpCode,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
      })
      .select()
      .single();

    if (challengeError) {
      console.error('Error creating 2FA challenge:', challengeError);
      return NextResponse.json({ error: 'Failed to create 2FA challenge' }, { status: 500 });
    }

    return NextResponse.json({
      challenge: challenge,
      message: '2FA challenge created successfully'
    });
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/auth/2fa/challenge - Verify challenge
export async function PUT(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { factorId, challengeId, code } = await req.json();

    if (!factorId || !challengeId || !code) {
      return NextResponse.json({ error: 'Factor ID, Challenge ID, and Code are required' }, { status: 400 });
    }

    // Verify challenge từ database
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('user_2fa_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('factor_id', factorId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }

    // Kiểm tra OTP code
    if (challenge.otp_code !== code) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
    }

    // Cập nhật challenge thành verified
    const { error: updateError } = await supabaseAdmin
      .from('user_2fa_challenges')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', challengeId);

    if (updateError) {
      console.error('Error updating challenge:', updateError);
      return NextResponse.json({ error: 'Failed to verify 2FA code' }, { status: 500 });
    }

    // Cập nhật factor status thành verified
    const { error: factorUpdateError } = await supabaseAdmin
      .from('user_2fa_factors')
      .update({ 
        status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', factorId);

    if (factorUpdateError) {
      console.error('Error updating factor:', factorUpdateError);
      return NextResponse.json({ error: 'Failed to verify 2FA code' }, { status: 500 });
    }

    const verified = true;

    return NextResponse.json({
      verified: true,
      message: '2FA code verified successfully'
    });
  } catch (error) {
    return handleError(error);
  }
} 