import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, handleError, supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await authenticate(req);
    
    // Get user details from database  
    const { data: user, error: userError } = await supabaseAdmin
      .from('employees')
      .select('id, role, auth_user_id')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user can update this employee's avatar
    // Admin/HR có thể update avatar của bất kỳ ai
    // Employee chỉ có thể update avatar của chính mình
    if (user.role !== 'admin' && user.role !== 'hr' && user.id !== params.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own avatar' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { avatar_url } = body;

    // Validate avatar_url (có thể null để xóa avatar)
    if (avatar_url !== null && typeof avatar_url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid avatar_url format' },
        { status: 400 }
      );
    }

    console.log('Attempting to update avatar for employee:', params.id);
    console.log('New avatar_url:', avatar_url);
    console.log('User attempting update:', { userId, userEmployeeId: user.id, userRole: user.role });

    // Update avatar_url in database
    const { data: updatedEmployee, error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ 
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select('id, name, avatar_url')
      .single();

    if (updateError) {
      console.error('Error updating avatar - Full error details:', JSON.stringify(updateError, null, 2));
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      console.error('Error hint:', updateError.hint);
      
      return NextResponse.json(
        { 
          error: 'Failed to update avatar in database',
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Avatar updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error in avatar update API:', error);
    return handleError(error);
  }
}
