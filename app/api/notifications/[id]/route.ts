import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/notifications/[id] - Cập nhật notification (chủ yếu mark as read)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  try {
    const userId = await authenticate(req);
    
    // Lấy thông tin user để biết role và employee_id
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData = await req.json();

    // Kiểm tra xem notification có tồn tại và user có quyền cập nhật không
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('target_users, target_role, created_by')
      .eq('id', id)
      .single();

    if (notifError) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Kiểm tra quyền: user phải là target của notification hoặc là creator
    const canUpdate = 
      notification.created_by === currentUser.id ||
      (notification.target_users && notification.target_users.includes(currentUser.id)) ||
      notification.target_role === currentUser.role ||
      notification.target_role === null;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Unauthorized to update this notification' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:employees!notifications_created_by_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/notifications/[id] - Xóa notification
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
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

    // Kiểm tra notification có tồn tại không
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('created_by')
      .eq('id', id)
      .single();

    if (notifError) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Chỉ creator hoặc admin/hr mới có thể xóa
    const canDelete = 
      notification.created_by === currentUser.id ||
      ['admin', 'hr'].includes(currentUser.role);

    if (!canDelete) {
      return NextResponse.json({ error: 'Unauthorized to delete this notification' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
} 