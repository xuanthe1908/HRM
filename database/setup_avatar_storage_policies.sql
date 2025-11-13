-- Tạo bucket avatar nếu chưa có
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar', 'avatar', true)
ON CONFLICT (id) DO NOTHING;

-- Xóa các policies cũ nếu có
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view avatars" ON storage.objects;

-- Policy cho phép authenticated users upload avatar
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatar');

-- Policy cho phép authenticated users update avatar (chỉ avatar của họ hoặc admin/hr)
CREATE POLICY "Allow authenticated users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatar' AND (
    -- User có thể update file có tên bắt đầu bằng user ID của họ
    name LIKE (auth.uid()::text || '-%') OR
    -- Hoặc user có role admin/hr (cần join với employees table)
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'hr')
    )
  )
);

-- Policy cho phép authenticated users delete avatar
CREATE POLICY "Allow authenticated users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatar' AND (
    name LIKE (auth.uid()::text || '-%') OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'hr')
    )
  )
);

-- Policy cho phép public xem avatar (vì bucket là public)
CREATE POLICY "Allow public to view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatar');

-- Kiểm tra và sửa RLS policy cho employees table
-- Policy cho phép user update avatar_url của chính họ
DROP POLICY IF EXISTS "Users can update their own avatar" ON employees;

CREATE POLICY "Users can update their own avatar"
ON employees FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Policy cho phép admin/hr update avatar của bất kỳ ai
DROP POLICY IF EXISTS "Admin and HR can update any employee avatar" ON employees;

CREATE POLICY "Admin and HR can update any employee avatar"
ON employees FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = auth.uid()
    AND e.role IN ('admin', 'hr')
  )
);
