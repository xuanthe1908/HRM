-- Function để cập nhật số ngày nghỉ phép đã sử dụng khi đơn xin nghỉ được duyệt
CREATE OR REPLACE FUNCTION update_employee_leave_days_used()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ cập nhật khi status thay đổi thành 'approved' hoặc từ 'approved' thành status khác
  IF (OLD.status != 'approved' AND NEW.status = 'approved') OR 
     (OLD.status = 'approved' AND NEW.status != 'approved') THEN
    
    -- Tính tổng số ngày nghỉ đã được duyệt cho nhân viên này
    UPDATE employees 
    SET leave_days_used = (
      SELECT COALESCE(SUM(total_days), 0)
      FROM leave_requests 
      WHERE employee_id = NEW.employee_id 
      AND status = 'approved'
    )
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho bảng leave_requests
DROP TRIGGER IF EXISTS update_employee_leave_days_used_trigger ON leave_requests;
CREATE TRIGGER update_employee_leave_days_used_trigger
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_leave_days_used();

-- Function để cập nhật khi thêm mới leave request được duyệt
CREATE OR REPLACE FUNCTION update_employee_leave_days_used_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ cập nhật khi status là 'approved'
  IF NEW.status = 'approved' THEN
    -- Tính tổng số ngày nghỉ đã được duyệt cho nhân viên này
    UPDATE employees 
    SET leave_days_used = (
      SELECT COALESCE(SUM(total_days), 0)
      FROM leave_requests 
      WHERE employee_id = NEW.employee_id 
      AND status = 'approved'
    )
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho INSERT
DROP TRIGGER IF EXISTS update_employee_leave_days_used_on_insert_trigger ON leave_requests;
CREATE TRIGGER update_employee_leave_days_used_on_insert_trigger
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_leave_days_used_on_insert();

-- Function để cập nhật khi xóa leave request
CREATE OR REPLACE FUNCTION update_employee_leave_days_used_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ cập nhật khi leave request bị xóa đã được duyệt
  IF OLD.status = 'approved' THEN
    -- Tính lại tổng số ngày nghỉ đã được duyệt cho nhân viên này
    UPDATE employees 
    SET leave_days_used = (
      SELECT COALESCE(SUM(total_days), 0)
      FROM leave_requests 
      WHERE employee_id = OLD.employee_id 
      AND status = 'approved'
    )
    WHERE id = OLD.employee_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho DELETE
DROP TRIGGER IF EXISTS update_employee_leave_days_used_on_delete_trigger ON leave_requests;
CREATE TRIGGER update_employee_leave_days_used_on_delete_trigger
  AFTER DELETE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_leave_days_used_on_delete();

-- Cập nhật lại tất cả số ngày nghỉ đã sử dụng cho tất cả nhân viên (chạy một lần)
UPDATE employees 
SET leave_days_used = (
  SELECT COALESCE(SUM(lr.total_days), 0)
  FROM leave_requests lr 
  WHERE lr.employee_id = employees.id 
  AND lr.status = 'approved'
);

COMMENT ON FUNCTION update_employee_leave_days_used() IS 'Cập nhật số ngày nghỉ phép đã sử dụng khi đơn xin nghỉ được duyệt hoặc bị hủy duyệt';
COMMENT ON FUNCTION update_employee_leave_days_used_on_insert() IS 'Cập nhật số ngày nghỉ phép đã sử dụng khi thêm mới đơn xin nghỉ được duyệt';
COMMENT ON FUNCTION update_employee_leave_days_used_on_delete() IS 'Cập nhật số ngày nghỉ phép đã sử dụng khi xóa đơn xin nghỉ đã được duyệt';