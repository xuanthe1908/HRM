import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

export interface SystemLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  status_code?: number;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

// GET /api/settings/logs - Lấy system logs từ audit_logs table
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    
    // Check if user has permission to view logs (admin only)
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized to view logs' }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const action = url.searchParams.get('action');
    const resource = url.searchParams.get('resource');
    const user_name = url.searchParams.get('user_name');

    console.log('🔍 Fetching audit logs with filters:', { limit, offset, action, resource, user_name });

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (action && action !== 'all') {
      query = query.ilike('action', `%${action}%`);
    }
    if (resource) {
      query = query.ilike('resource', `%${resource}%`);
    }
    if (user_name) {
      query = query.ilike('user_name', `%${user_name}%`);
    }

    const { data: auditLogs, error } = await query;

    if (error) {
      console.error('❌ Error fetching audit logs:', error);
      throw error;
    }

    console.log('📊 Found', auditLogs?.length || 0, 'audit log entries');

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (action && action !== 'all') {
      countQuery = countQuery.ilike('action', `%${action}%`);
    }
    if (resource) {
      countQuery = countQuery.ilike('resource', `%${resource}%`);
    }
    if (user_name) {
      countQuery = countQuery.ilike('user_name', `%${user_name}%`);
    }

    const { count } = await countQuery;

    // Transform to SystemLog format
    const logs: SystemLog[] = (auditLogs || []).map(log => ({
      id: log.id,
      user_id: log.user_id,
      user_name: log.user_name,
      user_email: log.user_email,
      action: log.action,
      resource: log.resource,
      resource_id: log.resource_id,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      request_method: log.request_method,
      request_url: log.request_url,
      status_code: log.status_code,
      old_values: log.old_values,
      new_values: log.new_values,
      created_at: log.created_at
    }));

    return NextResponse.json({
      logs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('💥 Error in audit logs API:', error);
    return handleError(error);
  }
} 