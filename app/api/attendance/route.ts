import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, handleError } from '@/lib/supabase-server';
import { getAttendanceTableName, getMysqlPool } from '@/lib/mysql';
import type { RowDataPacket } from 'mysql2/promise';

// GET /api/attendance - Lấy danh sách chấm công
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const now = new Date();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month/year' }, { status: 400 });
    }

    // Build date range [start, end)
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    // Load employees for mapping finger_id -> employee_id
    // NOTE: do NOT filter by status here; we want mapping to work even if employee status isn't "active"
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, name');
    if (empErr) throw empErr;

    const byFinger = new Map<string, { id: string; employee_code: string; name: string }>();
    (employees || []).forEach((e: any) => {
      const raw = String(e.employee_code || '').trim();
      const numeric = raw.replace(/\D/g, '');
      if (!numeric) return;

      // Support both forms:
      // - Supabase employee_code: NV00001 -> numeric "00001" -> normalized "1"
      // - MySQL finger_id: 1
      const normalized = String(parseInt(numeric, 10));
      if (normalized !== 'NaN') byFinger.set(normalized, { id: e.id, employee_code: raw, name: e.name });
      byFinger.set(numeric, { id: e.id, employee_code: raw, name: e.name });
    });

    const pool = getMysqlPool();
    const table = getAttendanceTableName();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT finger_id, check_time FROM \`${table}\` WHERE check_time >= ? AND check_time < ? ORDER BY check_time ASC`,
      [start, end]
    );

    // Group by employee_id + date (YYYY-MM-DD)
    const grouped = new Map<
      string,
      {
        employee_id: string;
        date: string;
        min: Date;
        max: Date;
      }
    >();

    for (const r of rows as any[]) {
      const rawFinger = String(r.finger_id);
      const normalizedFinger = String(parseInt(rawFinger, 10));
      const employee =
        byFinger.get(normalizedFinger) ||
        byFinger.get(rawFinger) ||
        // If finger_id isn't linked to any employee_code in Supabase, still return it for visibility.
        {
          id: `finger:${normalizedFinger === 'NaN' ? rawFinger : normalizedFinger}`,
          employee_code: `FINGER${normalizedFinger === 'NaN' ? rawFinger : normalizedFinger}`,
          name: 'Chưa liên kết nhân viên',
        };

      const dt = r.check_time instanceof Date ? r.check_time : new Date(r.check_time);
      if (Number.isNaN(dt.getTime())) continue;

      const date = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
        dt.getUTCDate()
      ).padStart(2, '0')}`;

      const key = `${employee.id}:${date}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { employee_id: employee.id, date, min: dt, max: dt });
      } else {
        if (dt < existing.min) existing.min = dt;
        if (dt > existing.max) existing.max = dt;
      }
    }

    const attendance = Array.from(grouped.values()).map((g) => {
      const diffMs = g.max.getTime() - g.min.getTime();
      const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
      // 8 hours = 1 công, otherwise proportional. Clamp to [0, 1].
      const rawWorkValue = hours / 8;
      const workValue = Math.max(0, Math.min(1, Math.round(rawWorkValue * 100) / 100));
      return {
        id: `${g.employee_id}-${g.date}`,
        employee_id: g.employee_id,
        date: g.date,
        status: 'present_full',
        check_in_time: g.min.toISOString(),
        check_out_time: g.max.toISOString(),
        working_hours: Math.round(hours * 100) / 100,
        work_value: workValue,
        overtime_hours: Math.max(0, Math.round((hours - 8) * 100) / 100),
      };
    });

    return NextResponse.json(attendance);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/attendance - Tạo bản ghi chấm công mới
export async function POST(req: NextRequest) {
  try {
    // Bypass authentication cho việc test
    // await authenticate(req);
    const attendanceData = await req.json();
    console.log('🔍 POST /api/attendance - attendanceData:', attendanceData);

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .insert(attendanceData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('✅ Created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('💥 POST error:', error);
    return handleError(error);
  }
} 