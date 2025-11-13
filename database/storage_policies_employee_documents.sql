-- =============================================
-- STORAGE POLICIES FOR EMPLOYEE DOCUMENTS BUCKET
-- =============================================

-- Tạo bucket 'employee-documents' nếu chưa có (chạy trong Supabase Dashboard)
-- Name: employee-documents
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Policy: Cho phép authenticated users upload
CREATE POLICY "Authenticated users can upload employee documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND
  -- Chỉ cho phép upload vào folder của employee mà user có quyền truy cập
  (
    -- Admin và HR có thể upload cho bất kỳ employee nào
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'hr')
    ) OR
    -- User chỉ có thể upload vào folder của chính mình
    (storage.foldername(name))[1] = (
      SELECT id::text FROM public.employees 
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Cho phép authenticated users view documents
CREATE POLICY "Authenticated users can view employee documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (
    -- Admin và HR có thể xem tất cả documents
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'hr')
    ) OR
    -- User chỉ có thể xem documents của chính mình
    (storage.foldername(name))[1] = (
      SELECT id::text FROM public.employees 
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Cho phép authenticated users update documents
CREATE POLICY "Authenticated users can update employee documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (
    -- Admin và HR có thể update tất cả documents
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'hr')
    ) OR
    -- User chỉ có thể update documents của chính mình
    (storage.foldername(name))[1] = (
      SELECT id::text FROM public.employees 
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Cho phép authenticated users delete documents
CREATE POLICY "Authenticated users can delete employee documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (
    -- Admin và HR có thể delete tất cả documents
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'hr')
    ) OR
    -- User chỉ có thể delete documents của chính mình
    (storage.foldername(name))[1] = (
      SELECT id::text FROM public.employees 
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- Enable RLS cho storage.objects nếu chưa có
ALTER TABLE storage.objects ENABLE row level security;

-- Xem tất cả policies cho bucket employee-documents
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%employee documents%';
