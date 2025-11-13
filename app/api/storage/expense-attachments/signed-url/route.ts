import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { paths } = await req.json() as { paths: string[] }
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths is required' }, { status: 400 })
    }

    const results: Record<string, string> = {}
    // Generate signed URL for each path (10 minutes)
    for (const p of paths) {
      const { data, error } = await supabaseAdmin.storage
        .from('expense-attachments')
        .createSignedUrl(p, 60 * 10)
      if (!error && data?.signedUrl) {
        results[p] = data.signedUrl
      }
    }

    return NextResponse.json({ urls: results })
  } catch (err) {
    return NextResponse.json({ error: 'failed_to_create_signed_urls' }, { status: 500 })
  }
}

