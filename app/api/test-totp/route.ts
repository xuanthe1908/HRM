import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

// GET /api/test-totp - Test TOTP generation and verification
export async function GET(req: NextRequest) {
  try {
    // Generate a test secret
    const secretObj = speakeasy.generateSecret({
      name: 'test@example.com',
      issuer: 'Test System',
      length: 32
    });
    
    const secret = secretObj.base32;
    const qrCode = secretObj.otpauth_url;
    
    // Generate current TOTP
    const currentTotp = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
    
    // Test verification
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: currentTotp,
      window: 1
    });
    
    return NextResponse.json({
      secret: secret,
      qrCode: qrCode,
      currentTotp: currentTotp,
      isValid: isValid,
      message: 'TOTP test completed'
    });
  } catch (error) {
    console.error('Error in TOTP test:', error);
    return NextResponse.json({ error: 'TOTP test failed' }, { status: 500 });
  }
}

// POST /api/test-totp - Test with specific secret
export async function POST(req: NextRequest) {
  try {
    const { secret, code } = await req.json();
    
    if (!secret) {
      return NextResponse.json({ error: 'Secret is required' }, { status: 400 });
    }
    
    console.log('Testing with secret:', secret);
    
    // Generate current TOTP
    const currentTotp = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
    
    console.log('Current TOTP:', currentTotp);
    
    // Test verification if code provided
    let isValid = null;
    if (code) {
      isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 1
      });
      console.log('Verification result:', isValid);
    }
    
    return NextResponse.json({
      secret: secret,
      currentTotp: currentTotp,
      isValid: isValid,
      message: 'TOTP test with specific secret completed'
    });
  } catch (error) {
    console.error('Error in TOTP test:', error);
    return NextResponse.json({ error: 'TOTP test failed' }, { status: 500 });
  }
} 