import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { getAttendanceTableName, getMysqlPool } from '@/lib/mysql';
import type { RowDataPacket } from 'mysql2/promise';

// NOTE: Changed to POST to align with Supabase RPC call conventions from the client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    const month = body.month;
    const year = body.year;

    if (!month || !year) {
      console.error('Missing month or year in request body');
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const p_month = parseInt(month, 10);
    const p_year = parseInt(year, 10);

    console.log('Parsed RPC parameters:', { p_month, p_year });

    if (isNaN(p_month) || isNaN(p_year)) {
      console.error('Invalid month or year format');
      return NextResponse.json({ error: 'Invalid month or year format' }, { status: 400 });
    }

    // Use MySQL as data source for attendance logs, then aggregate per employee.
    // We keep auth behavior consistent with existing endpoint.
    await authenticate(req);

    const start = new Date(Date.UTC(p_year, p_month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(p_year, p_month, 1, 0, 0, 0));

    // NOTE: do NOT filter by status here; otherwise some finger_id may never match.
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, name');
    if (empErr) throw empErr;

    const byFinger = new Map<string, { id: string; employee_code: string; name: string }>();
    (employees || []).forEach((e: any) => {
      const raw = String(e.employee_code || '').trim();
      const numeric = raw.replace(/\D/g, '');
      if (!numeric) return;
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

    // Group by employee_id + date
    const dayKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(
        2,
        '0'
      )}`;

    const perEmployeeDay = new Map<string, { employee_id: string; date: string; min: Date; max: Date }>();
    for (const r of rows as any[]) {
      const rawFinger = String(r.finger_id);
      const normalizedFinger = String(parseInt(rawFinger, 10));
      const employee =
        byFinger.get(normalizedFinger) ||
        byFinger.get(rawFinger) ||
        {
          id: `finger:${normalizedFinger === 'NaN' ? rawFinger : normalizedFinger}`,
          employee_code: `FINGER${normalizedFinger === 'NaN' ? rawFinger : normalizedFinger}`,
          name: 'Chưa liên kết nhân viên',
        };

      const dt = r.check_time instanceof Date ? r.check_time : new Date(r.check_time);
      if (Number.isNaN(dt.getTime())) continue;

      const date = dayKey(dt);
      const key = `${employee.id}:${date}`;
      const existing = perEmployeeDay.get(key);
      if (!existing) perEmployeeDay.set(key, { employee_id: employee.id, date, min: dt, max: dt });
      else {
        if (dt < existing.min) existing.min = dt;
        if (dt > existing.max) existing.max = dt;
      }
    }

    const summaryByEmp = new Map<
      string,
      {
        employee_id: string;
        employee_code: string;
        employee_name: string;
        total_work_days: number;
        total_overtime_days: number;
        total_paid_leave: number;
        total_unpaid_leave: number;
        total_overtime_hours: number;
      }
    >();

    for (const day of perEmployeeDay.values()) {
      const emp =
        (employees || []).find((e: any) => e.id === day.employee_id) ||
        // Fallback for unlinked finger_id
        {
          id: day.employee_id,
          employee_code: String(day.employee_id).startsWith('finger:')
            ? `FINGER${String(day.employee_id).slice('finger:'.length)}`
            : String(day.employee_id),
          name: 'Chưa liên kết nhân viên',
        };
      const existing = summaryByEmp.get(day.employee_id);
      const diffMs = day.max.getTime() - day.min.getTime();
      const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
      const workValue = Math.max(0, Math.min(1, Math.round((hours / 8) * 100) / 100));
      const overtimeHours = Math.max(0, Math.round((hours - 8) * 100) / 100);
      if (!existing) {
        summaryByEmp.set(day.employee_id, {
          employee_id: day.employee_id,
          employee_code: emp.employee_code,
          employee_name: emp.name,
          total_work_days: workValue,
          total_overtime_days: 0,
          total_paid_leave: 0,
          total_unpaid_leave: 0,
          total_overtime_hours: overtimeHours,
        });
      } else {
        existing.total_work_days += workValue;
        existing.total_overtime_hours += overtimeHours;
      }
    }

    return NextResponse.json(Array.from(summaryByEmp.values()));
  } catch (error) {
    console.error('Caught an error in POST /api/attendance/summary:', error);
    return handleError(error);
  }
}

// Keep the GET method for direct browser access or other clients if needed,
// but redirect its logic to the new POST handler's core logic.
// This is not ideal, but provides backward compatibility if anything was relying on GET.
// For robust solution, all clients should be updated to use POST.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    console.log('Received GET request params:', { month, year });

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const p_month = parseInt(month, 10);
    const p_year = parseInt(year, 10);

    console.log('Parsed RPC parameters for GET:', { p_month, p_year });

    if (isNaN(p_month) || isNaN(p_year)) {
      console.error('Invalid month or year format in GET request');
      return NextResponse.json({ error: 'Invalid month or year format' }, { status: 400 });
    }

    // Keep behavior consistent: reuse POST by calling it directly is awkward in Next,
    // so we duplicate the same aggregation logic with query params.
    await authenticate(req);

    const start = new Date(Date.UTC(p_year, p_month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(p_year, p_month, 1, 0, 0, 0));

    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, name');
    if (empErr) throw empErr;

    const byFinger = new Map<string, { id: string; employee_code: string; name: string }>();
    (employees || []).forEach((e: any) => {
      const raw = String(e.employee_code || '').trim();
      const numeric = raw.replace(/\D/g, '');
      if (!numeric) return;
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

    const dayKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(
        2,
        '0'
      )}`;

    const perEmployeeDay = new Map<string, { employee_id: string; date: string; min: Date; max: Date }>();
    for (const r of rows as any[]) {
      const rawFinger = String(r.finger_id);
      const normalizedFinger = String(parseInt(rawFinger, 10));
      const employee =
        byFinger.get(normalizedFinger) ||
        byFinger.get(rawFinger) ||
        {
          id: `finger:${normalizedFinger === 'NaN' ? rawFinger : normalizedFinger}`,
          employee_code: `FINGER${normalizedFinger === 'NaN' ? rawFinger : normalizedFinger}`,
          name: 'Chưa liên kết nhân viên',
        };

      const dt = r.check_time instanceof Date ? r.check_time : new Date(r.check_time);
      if (Number.isNaN(dt.getTime())) continue;

      const date = dayKey(dt);
      const key = `${employee.id}:${date}`;
      const existing = perEmployeeDay.get(key);
      if (!existing) perEmployeeDay.set(key, { employee_id: employee.id, date, min: dt, max: dt });
      else {
        if (dt < existing.min) existing.min = dt;
        if (dt > existing.max) existing.max = dt;
      }
    }

    const summaryByEmp = new Map<
      string,
      {
        employee_id: string;
        employee_code: string;
        employee_name: string;
        total_work_days: number;
        total_overtime_days: number;
        total_paid_leave: number;
        total_unpaid_leave: number;
        total_overtime_hours: number;
      }
    >();

    for (const day of perEmployeeDay.values()) {
      const emp =
        (employees || []).find((e: any) => e.id === day.employee_id) ||
        {
          id: day.employee_id,
          employee_code: String(day.employee_id).startsWith('finger:')
            ? `FINGER${String(day.employee_id).slice('finger:'.length)}`
            : String(day.employee_id),
          name: 'Chưa liên kết nhân viên',
        };
      const existing = summaryByEmp.get(day.employee_id);
      const diffMs = day.max.getTime() - day.min.getTime();
      const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
      const workValue = Math.max(0, Math.min(1, Math.round((hours / 8) * 100) / 100));
      const overtimeHours = Math.max(0, Math.round((hours - 8) * 100) / 100);
      if (!existing) {
        summaryByEmp.set(day.employee_id, {
          employee_id: day.employee_id,
          employee_code: emp.employee_code,
          employee_name: emp.name,
          total_work_days: workValue,
          total_overtime_days: 0,
          total_paid_leave: 0,
          total_unpaid_leave: 0,
          total_overtime_hours: overtimeHours,
        });
      } else {
        existing.total_work_days += workValue;
        existing.total_overtime_hours += overtimeHours;
      }
    }

    return NextResponse.json(Array.from(summaryByEmp.values()));
  } catch (error) {
    console.error('Caught an error in GET /api/attendance/summary:', error);
    return handleError(error);
  }
}
