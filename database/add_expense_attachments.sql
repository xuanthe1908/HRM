-- Add expense attachments support
-- Chạy file này trên Supabase để thêm hỗ trợ upload file cho expense requests

-- 1. Thêm cột mới cho file attachments (JSON để lưu thông tin chi tiết)
ALTER TABLE public.expense_requests 
ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Thêm comment cho cột mới
COMMENT ON COLUMN public.expense_requests.file_attachments IS 'Lưu thông tin file attachments dưới dạng JSON array';

-- 3. Tạo bucket storage cho expense attachments
-- Lưu ý: Bạn cần tạo bucket này trong Supabase Dashboard > Storage
-- Bucket name: "expense-attachments"
-- Public bucket: false (private)
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- 4. Tạo function để validate file upload
CREATE OR REPLACE FUNCTION validate_expense_attachment(
    p_file_name TEXT,
    p_file_size BIGINT,
    p_mime_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Kiểm tra kích thước file (tối đa 10MB)
    IF p_file_size > 10 * 1024 * 1024 THEN
        RETURN FALSE;
    END IF;
    
    -- Kiểm tra loại file được phép
    IF p_mime_type NOT IN (
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Tạo function để thêm file attachment vào expense request
CREATE OR REPLACE FUNCTION add_expense_attachment(
    p_expense_id UUID,
    p_file_name TEXT,
    p_file_url TEXT,
    p_file_size BIGINT,
    p_mime_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_attachments JSONB;
    v_new_attachment JSONB;
BEGIN
    -- Validate file
    IF NOT validate_expense_attachment(p_file_name, p_file_size, p_mime_type) THEN
        RETURN FALSE;
    END IF;
    
    -- Lấy attachments hiện tại
    SELECT COALESCE(file_attachments, '[]'::jsonb) INTO v_current_attachments
    FROM expense_requests 
    WHERE id = p_expense_id;
    
    -- Tạo attachment object mới
    v_new_attachment := jsonb_build_object(
        'id', gen_random_uuid(),
        'file_name', p_file_name,
        'file_url', p_file_url,
        'file_size', p_file_size,
        'mime_type', p_mime_type,
        'uploaded_at', now()
    );
    
    -- Thêm vào array
    v_current_attachments := v_current_attachments || v_new_attachment;
    
    -- Cập nhật database
    UPDATE expense_requests 
    SET file_attachments = v_current_attachments
    WHERE id = p_expense_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Tạo function để xóa file attachment
CREATE OR REPLACE FUNCTION remove_expense_attachment(
    p_expense_id UUID,
    p_attachment_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_attachments JSONB;
    v_filtered_attachments JSONB;
BEGIN
    -- Lấy attachments hiện tại
    SELECT COALESCE(file_attachments, '[]'::jsonb) INTO v_current_attachments
    FROM expense_requests 
    WHERE id = p_expense_id;
    
    -- Lọc bỏ attachment cần xóa
    SELECT jsonb_agg(attachment) INTO v_filtered_attachments
    FROM jsonb_array_elements(v_current_attachments) AS attachment
    WHERE (attachment->>'id')::UUID != p_attachment_id;
    
    -- Cập nhật database
    UPDATE expense_requests 
    SET file_attachments = COALESCE(v_filtered_attachments, '[]'::jsonb)
    WHERE id = p_expense_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. Tạo RLS policy cho file attachments
-- Policy cho phép employee xem attachments của expense requests của mình
CREATE POLICY "Employees can view their own expense attachments" ON expense_requests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id FROM employees WHERE id = employee_id
        )
    );

-- Policy cho phép admin/hr xem tất cả attachments
CREATE POLICY "Admins can view all expense attachments" ON expense_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'hr')
        )
    );

-- Thông báo hoàn thành
SELECT 'Expense attachments support has been added successfully!' as status;

