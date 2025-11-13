import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const employeeId = form.get('employee_id') as string | null
    const files = form.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'no_files' }, { status: 400 })
    }

    const userFolder = employeeId || 'unknown'
    const results: Array<{ id: string; file_name: string; file_size: number; mime_type: string; storage_path: string; uploaded_at: string; }> = []

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin'
      const uuid = crypto.randomUUID()
      const storagePath = `${userFolder}/${uuid}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabaseAdmin.storage
        .from('expense-attachments')
        .upload(storagePath, Buffer.from(arrayBuffer), { contentType: file.type })

      if (uploadError) {
        console.error('upload error', uploadError)
        continue
      }

      // Do not generate public URL for private bucket; client will request signed URL when viewing
      results.push({
        id: uuid,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        uploaded_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ files: results })
  } catch (e) {
    console.error('server upload failed', e)
    return NextResponse.json({ error: 'server_upload_failed' }, { status: 500 })
  }
}
