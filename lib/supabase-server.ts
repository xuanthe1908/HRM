import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Khởi tạo Supabase client phía server (dùng service_role_key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Handle build-time environment variable issues
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV;
const hasValidEnvVars = supabaseUrl && supabaseServiceKey && 
  supabaseUrl !== 'undefined' && supabaseServiceKey !== 'undefined';

if (!hasValidEnvVars && !isBuildTime) {
  console.warn('⚠️ Supabase server environment variables not found');
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-key'
);

// Hàm xác thực token từ request và trả về user ID
export async function authenticate(req: NextRequest): Promise<string> {
  // Try to get token from HttpOnly cookie first (Supabase default cookie name)
  // Fallback to Authorization header for backward compatibility
  let token: string | null = null;

  try {
    // next/headers cookies only available in Server Components/route handlers context
    const cookieStore = cookies();
    token = cookieStore.get('sb-access-token')?.value || null;
  } catch {}

  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    token = authHeader.split(' ')[1] || null;
  }

  if (!token) {
    throw new Error('Invalid token format');
  }

  try {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      audience: 'authenticated', 
    });
    
    // Sử dụng admin client để lấy thông tin user từ ID (để đảm bảo user còn tồn tại)
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(payload.sub || '');
    
    if (error || !user) {
      throw new Error('User not found or error fetching user');
    }
    
    // Trả về user ID (string) để tương thích với tất cả API routes hiện có
    return user.id;

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'JWTExpired' || error.message.includes('expired')) {
        throw new Error('Token has expired');
      }
      if (error.name === 'JWTInvalid' || error.message.includes('invalid')) {
        throw new Error('Invalid token');
      }
      if (error.message.includes('malformed')) {
        throw new Error('Malformed token');
      }
    }
    throw new Error('Invalid token');
  }
}

// Hàm xử lý lỗi chung cho API
export function handleError(error: unknown, defaultMessage: string = 'An internal server error occurred', tableName?: string) {
    let message = error instanceof Error ? error.message : defaultMessage;
    let status = 500;

    // Xử lý error object từ Supabase
    if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as any;
        if (supabaseError.code === '23505') {
            status = 409;
            // Customize error message based on table
            if (tableName === 'departments') {
                message = 'Tên phòng ban đã tồn tại trong hệ thống';
            } else if (tableName === 'positions') {
                message = 'Tên chức vụ đã tồn tại trong hệ thống';
            } else if (tableName === 'budgets') {
                message = 'Ngân sách đã tồn tại cho kỳ này';
            } else {
                message = 'Dữ liệu đã tồn tại trong hệ thống';
            }
        } else if (supabaseError.code === '23503') {
            status = 400;
            message = 'Dữ liệu tham chiếu không hợp lệ';
        } else if (supabaseError.code === '23502') {
            status = 400;
            message = 'Thiếu các trường bắt buộc';
        }
    } else {
        // Xử lý các loại lỗi cụ thể khác
        if (message === 'Missing authorization header' || message.includes('token')) {
            status = 401;
        } else if (message.includes('duplicate key') || message.includes('violates unique constraint') || message.includes('23505')) {
            status = 409;
            if (tableName === 'departments') {
                message = 'Tên phòng ban đã tồn tại trong hệ thống';
            } else if (tableName === 'positions') {
                message = 'Tên chức vụ đã tồn tại trong hệ thống';
            } else if (tableName === 'budgets') {
                message = 'Ngân sách đã tồn tại cho kỳ này';
            } else {
                message = 'Dữ liệu đã tồn tại trong hệ thống';
            }
        } else if (message.includes('foreign key constraint')) {
            status = 400;
            message = 'Dữ liệu tham chiếu không hợp lệ';
        } else if (message.includes('not null constraint')) {
            status = 400;
            message = 'Thiếu các trường bắt buộc';
        }
    }

    return NextResponse.json({ error: message }, { status });
} 