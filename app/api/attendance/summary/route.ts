import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

// NOTE: Changed to POST to align with Supabase RPC call conventions from the client
export async function POST(req: NextRequest) {
  try {
    await authenticate(req);

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

    const { data, error } = await supabaseAdmin.rpc('get_attendance_summary', {
      p_month,
      p_year
    });

    if (error) {
      console.error('Error fetching attendance summary from RPC:', error);
      throw error;
    }

    console.log('Successfully fetched data from RPC:', data);
    return NextResponse.json(data);
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
    await authenticate(req);

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

     const { data, error } = await supabaseAdmin.rpc('get_attendance_summary', {
      p_month,
      p_year
    });

    if (error) {
      console.error('Error fetching attendance summary via GET:', error);
      throw error;
    }

    console.log('Successfully fetched data via GET:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Caught an error in GET /api/attendance/summary:', error);
    return handleError(error);
  }
}
