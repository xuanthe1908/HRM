-- =============================================
-- EMPLOYEE STATUS TRIGGER - AUTO DISABLE AUTH ACCOUNT
-- =============================================

-- Function để tự động vô hiệu hóa tài khoản Supabase Auth khi employee status = 'terminated'
CREATE OR REPLACE FUNCTION handle_employee_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ xử lý khi status thay đổi thành 'terminated'
  IF NEW.status = 'terminated' AND (OLD.status IS NULL OR OLD.status != 'terminated') THEN
    -- Kiểm tra xem employee có auth_user_id không
    IF NEW.auth_user_id IS NOT NULL THEN
      -- Ghi log hành động
      INSERT INTO audit_logs (
        resource,
        resource_id,
        action,
        old_values,
        new_values,
        user_id,
        details
      ) VALUES (
        'employees',
        NEW.id::text,
        'STATUS_CHANGE_TO_TERMINATED',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        NEW.id,
        'Employee status changed to terminated - Auth account should be disabled'
      );
      
      -- Ghi log để admin biết cần vô hiệu hóa tài khoản
      RAISE NOTICE 'Employee % (ID: %) status changed to terminated. Auth user ID: %. Please disable the Supabase Auth account manually.', 
        NEW.name, NEW.id, NEW.auth_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho bảng employees
DROP TRIGGER IF EXISTS employee_status_change_trigger ON employees;
CREATE TRIGGER employee_status_change_trigger
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_employee_status_change();

-- Function để kiểm tra và vô hiệu hóa tài khoản Auth (cần chạy thủ công)
CREATE OR REPLACE FUNCTION disable_terminated_employee_accounts()
RETURNS TABLE(employee_id UUID, employee_name TEXT, auth_user_id UUID, action TEXT) AS $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Tìm tất cả nhân viên có status = 'terminated' và có auth_user_id
  FOR emp_record IN 
    SELECT id, name, auth_user_id 
    FROM employees 
    WHERE status = 'terminated' 
    AND auth_user_id IS NOT NULL
  LOOP
    -- Ghi log hành động
    INSERT INTO audit_logs (
      resource,
      resource_id,
      action,
      old_values,
      new_values,
      user_id,
      details
    ) VALUES (
      'employees',
      emp_record.id::text,
      'AUTH_ACCOUNT_DISABLE_REQUESTED',
      jsonb_build_object('auth_user_id', emp_record.auth_user_id),
      jsonb_build_object('status', 'terminated'),
      emp_record.id,
      'Auth account disable requested for terminated employee'
    );
    
    -- Trả về thông tin để admin xử lý
    employee_id := emp_record.id;
    employee_name := emp_record.name;
    auth_user_id := emp_record.auth_user_id;
    action := 'DISABLE_AUTH_ACCOUNT';
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function để cập nhật end_date khi status = 'terminated'
CREATE OR REPLACE FUNCTION update_employee_end_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi status thay đổi thành 'terminated', tự động cập nhật end_date
  IF NEW.status = 'terminated' AND (OLD.status IS NULL OR OLD.status != 'terminated') THEN
    -- Chỉ cập nhật nếu end_date chưa được set
    IF NEW.end_date IS NULL THEN
      NEW.end_date := CURRENT_DATE;
    END IF;
    
    -- Cập nhật termination_date nếu chưa có
    IF NEW.termination_date IS NULL THEN
      NEW.termination_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật end_date
DROP TRIGGER IF EXISTS employee_end_date_trigger ON employees;
CREATE TRIGGER employee_end_date_trigger
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_end_date();

-- Bảng audit_logs đã tồn tại với schema khác, không cần tạo lại
-- Schema hiện tại:
-- create table public.audit_logs (
--   id uuid not null default gen_random_uuid (),
--   user_id uuid null,
--   user_name character varying(255) null,
--   user_email character varying(255) null,
--   action character varying(100) not null,
--   resource character varying(255) not null,
--   resource_id character varying(255) null,
--   details text null,
--   ip_address inet null,
--   user_agent text null,
--   request_method character varying(10) null,
--   request_url text null,
--   status_code integer null,
--   old_values jsonb null,
--   new_values jsonb null,
--   created_at timestamp with time zone null default now(),
--   constraint audit_logs_pkey primary key (id),
--   constraint audit_logs_user_id_fkey foreign KEY (user_id) references employees (id)
-- )

-- Comment cho các function
COMMENT ON FUNCTION handle_employee_status_change() IS 'Trigger function để xử lý khi employee status thay đổi thành terminated';
COMMENT ON FUNCTION disable_terminated_employee_accounts() IS 'Function để kiểm tra và yêu cầu vô hiệu hóa tài khoản Auth cho nhân viên đã nghỉ việc';
COMMENT ON FUNCTION update_employee_end_date() IS 'Trigger function để tự động cập nhật end_date khi status = terminated';
