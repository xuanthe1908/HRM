import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z } from 'zod';

const recoverySchema = z.object({
  email: z.string().email('Email không hợp lệ.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = recoverySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    console.log(`Password recovery requested for email: ${email}`);

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);

    if (error) {
      console.error('Error sending password recovery email:', error);
      // Even if there's an error (like user not found), we don't want to reveal that info.
      // We always return a generic success message to prevent user enumeration attacks.
    }
    
    // Always return a positive response to prevent email enumeration.
    return NextResponse.json({ 
      message: 'Nếu một tài khoản với email này tồn tại, một liên kết đặt lại mật khẩu đã được gửi.' 
    });

  } catch (error) {
    console.error('Password recovery endpoint failed:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
