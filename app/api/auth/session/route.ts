import { type NextRequest, NextResponse } from 'next/server';

// POST /api/auth/session - Set HttpOnly auth cookie from Authorization header
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true });
    // Set HttpOnly cookie for server-side authentication
    res.cookies.set('sb-access-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // Let browser manage expiry based on token lifetime; no explicit expires
    });
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}

// DELETE /api/auth/session - Clear auth cookie
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('sb-access-token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return res;
}


