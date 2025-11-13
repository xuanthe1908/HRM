import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { settingsService } from '@/lib/settings-service';
import speakeasy from 'speakeasy';

// GET /api/auth/2fa - Kiểm tra trạng thái 2FA của user
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    // Lấy thông tin user
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Kiểm tra xem 2FA có được bật trong settings không
    const is2FAEnabled = await settingsService.isTwoFactorAuthEnabled();
    
    // Kiểm tra xem user có 2FA factor không
    const { data: factors, error: factorsError } = await supabaseAdmin
      .from('user_2fa_factors')
      .select('*')
      .eq('user_id', currentUser.id);

    if (factorsError) {
      console.error('Error fetching 2FA factors:', factorsError);
      return NextResponse.json({ error: 'Failed to fetch 2FA status' }, { status: 500 });
    }

    // Tính factors đã verified và unverified
    const verifiedFactors = factors?.filter(factor => factor.status === 'verified') || [];
    const unverifiedFactors = factors?.filter(factor => factor.status === 'unverified') || [];
    
    // has2FA = true nếu có factors (verified hoặc unverified)
    const has2FA = factors && factors.length > 0;
    const isVerified = verifiedFactors.length > 0;
    const isRequired = is2FAEnabled && ['admin', 'hr'].includes(currentUser.role);

    return NextResponse.json({
      enabled: is2FAEnabled,
      required: isRequired,
      has2FA: has2FA,
      isVerified: isVerified,
      factors: factors || [],
      verifiedFactors: verifiedFactors,
      unverifiedFactors: unverifiedFactors
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/auth/2fa - Tạo 2FA factor mới với QR code
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { factorType = 'totp' } = await req.json();

    // Lấy thông tin user
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role, email')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Kiểm tra xem 2FA có được bật trong settings không
    const is2FAEnabled = await settingsService.isTwoFactorAuthEnabled();
    const isRequired = is2FAEnabled && ['admin', 'hr'].includes(currentUser.role);

    if (!isRequired) {
      return NextResponse.json({ error: '2FA is not required for this user' }, { status: 400 });
    }

    // Tạo secret key cho TOTP
    const secretObj = speakeasy.generateSecret({
      name: currentUser.email,
      issuer: 'HRM System',
      length: 32
    });
    const secret = secretObj.base32;
    
    // Tạo factor mới trong database
    const { data: factor, error: factorError } = await supabaseAdmin
      .from('user_2fa_factors')
      .insert({
        user_id: currentUser.id,
        friendly_name: `${currentUser.role} 2FA`,
        factor_type: factorType,
        status: 'unverified',
        secret: secret
      })
      .select()
      .single();

    if (factorError) {
      console.error('Error creating 2FA factor:', factorError);
      return NextResponse.json({ error: 'Failed to create 2FA factor' }, { status: 500 });
    }

    // Log attempt
    await supabaseAdmin.rpc('log_2fa_attempt', {
      p_user_id: currentUser.id,
      p_attempt_type: 'setup',
      p_success: true,
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      p_user_agent: req.headers.get('user-agent')
    });

    // Tạo QR code data
    const qrData = secretObj.otpauth_url;

    console.log('2FA factor created successfully:', { factor, qrData });

    return NextResponse.json({
      factor: factor,
      qrCode: qrData,
      secret: secret,
      message: '2FA factor created successfully'
    });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/auth/2fa - Xóa 2FA factor
export async function DELETE(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const { factorId } = await req.json();

    if (!factorId) {
      return NextResponse.json({ error: 'Factor ID is required' }, { status: 400 });
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

    // Xóa factor từ database
    const { error: deleteError } = await supabaseAdmin
      .from('user_2fa_factors')
      .delete()
      .eq('id', factorId)
      .eq('user_id', currentUser.id);

    if (deleteError) {
      console.error('Error deleting 2FA factor:', deleteError);
      return NextResponse.json({ error: 'Failed to delete 2FA factor' }, { status: 500 });
    }

    // Log attempt
    await supabaseAdmin.rpc('log_2fa_attempt', {
      p_user_id: currentUser.id,
      p_attempt_type: 'disable',
      p_success: true,
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      p_user_agent: req.headers.get('user-agent')
    });

    return NextResponse.json({
      message: '2FA factor deleted successfully'
    });
  } catch (error) {
    return handleError(error);
  }
}

 