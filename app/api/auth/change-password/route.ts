import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { z } from 'zod';

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự.'),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    const body = await req.json();

    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { newPassword } = parsed.data;

    console.log(`Password change requested for user: ${userId}`);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('Error updating user password:', error);
      return NextResponse.json(
        { error: `Không thể cập nhật mật khẩu: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Mật khẩu đã được cập nhật thành công.' });

  } catch (error) {
    console.error('Change password endpoint failed:', error);
    return handleError(error);
  }
}
