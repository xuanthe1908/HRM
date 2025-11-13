import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    // Require authenticated user
    await authenticate(req)

    const { paths, expiresIn } = await req.json()

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths must be a non-empty array' }, { status: 400 })
    }

    const expires = Number(expiresIn) > 0 ? Number(expiresIn) : 60 * 10 // default 10 minutes

    const bucket = 'employee-documents'

    const results = await Promise.all(
      paths.map(async (path: string) => {
        if (!path || typeof path !== 'string') {
          return { path, signedUrl: null, error: 'invalid_path' }
        }
        const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expires)
        if (error || !data) {
          return { path, signedUrl: null, error: error?.message || 'sign_failed' }
        }
        return { path, signedUrl: data.signedUrl, error: null }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    return handleError(error, 'Failed to create signed URLs')
  }
}


