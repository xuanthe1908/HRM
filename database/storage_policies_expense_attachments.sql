-- Storage policies for expense attachments bucket
-- Bucket: expense-attachments

-- Enable RLS on storage.objects if not already
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed (safe no-op if not exists)
DROP POLICY IF EXISTS "Users can read own expense attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own expense attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins HR can read all expense attachments" ON storage.objects;

-- Users can read files in their own folder: <auth.uid()>/<filename>
CREATE POLICY "Users can read own expense attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Users can upload files to their own folder only
CREATE POLICY "Users can upload own expense attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'expense-attachments'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Admins and HR can read all files in the bucket
CREATE POLICY "Admins HR can read all expense attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
    AND e.role IN ('admin','hr')
  )
);

-- Optional: allow Admin/HR to upload anywhere (if needed)
-- CREATE POLICY "Admins HR can upload any expense attachments"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'expense-attachments'
--   AND EXISTS (
--     SELECT 1 FROM public.employees e
--     WHERE e.auth_user_id = auth.uid()
--     AND e.role IN ('admin','hr')
--   )
-- );

-- Note: If the bucket is private, clients will need SELECT permission to generate signed URLs via supabase-js.

