import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// GET /api/notifications - Lấy danh sách thông báo cho user hiện tại
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    // Lấy thông tin user để biết role
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Lấy notifications dành cho user này dựa trên:
    // 1. target_users chứa user ID (specific user targeting)
    // 2. target_role khớp với role của user (role-based targeting)
    // 3. target_role là null VÀ target_users chứa user ID (general notifications for specific users)
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        creator:employees!notifications_created_by_fkey(id, name, email)
      `)
      .or(
        `target_users.cs.{${currentUser.id}},` +
        `and(target_role.eq.${currentUser.role},target_users.is.null),` +
        `and(target_role.is.null,target_users.cs.{${currentUser.id}})`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/notifications - Tạo thông báo mới
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    // Kiểm tra quyền tạo notification (chỉ admin/hr được tạo)
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized to create notifications' }, { status: 403 });
    }

    const notificationData = await req.json();
    
    // Thêm created_by
    notificationData.created_by = currentUser.id;

    // Nếu target_role được chỉ định, lấy danh sách user có role đó
    if (notificationData.target_role && !notificationData.target_users) {
      const { data: targetUsers } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('role', notificationData.target_role);
      
      if (targetUsers && targetUsers.length > 0) {
        notificationData.target_users = targetUsers.map(user => user.id);
      }
    }
    
    // Nếu target_role là undefined hoặc "all" (tất cả mọi người), lấy tất cả user active
    if ((!notificationData.target_role || notificationData.target_role === "all") && !notificationData.target_users) {
      const { data: allUsers } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('status', 'active');
      
      if (allUsers && allUsers.length > 0) {
        notificationData.target_users = allUsers.map(user => user.id);
      }
      // Set target_role thành null để đánh dấu là thông báo chung
      notificationData.target_role = null;
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notificationData)
      .select(`
        *,
        creator:employees!notifications_created_by_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
} 