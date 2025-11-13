-- =============================================
-- PROBATION MANAGEMENT TRIGGERS
-- =============================================
-- Tự động quản lý thời gian thử việc của nhân viên

-- Function để lấy ID của position "Thử việc"
CREATE OR REPLACE FUNCTION get_probation_position_id()
RETURNS UUID AS $$
DECLARE
    probation_id UUID;
BEGIN
    SELECT id INTO probation_id 
    FROM positions 
    WHERE name = 'Thử việc' 
    LIMIT 1;
    
    RETURN probation_id;
END;
$$ LANGUAGE plpgsql;

-- Function để kiểm tra xem position có phải là "Thử việc" không
CREATE OR REPLACE FUNCTION is_probation_position(position_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    position_name VARCHAR(255);
BEGIN
    SELECT name INTO position_name 
    FROM positions 
    WHERE id = position_id;
    
    RETURN (position_name = 'Thử việc');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER 1: Tự động điền ngày thử việc khi tạo nhân viên thử việc
-- =============================================
CREATE OR REPLACE FUNCTION auto_fill_probation_start_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Khi INSERT nhân viên mới với position_id là "Thử việc"
    IF TG_OP = 'INSERT' THEN
        IF NEW.position_id IS NOT NULL AND is_probation_position(NEW.position_id) THEN
            -- Tự động điền probation_start_date = ngày hiện tại nếu chưa có
            IF NEW.probation_start_date IS NULL THEN
                NEW.probation_start_date := CURRENT_DATE;
            END IF;
            
            -- Đảm bảo probation_result = "Đang thử việc"
            IF NEW.probation_result IS NULL OR NEW.probation_result = '' THEN
                NEW.probation_result := 'Đang thử việc';
            END IF;
            
            -- Clear official_start_date nếu có (vì đang thử việc)
            NEW.official_start_date := NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho INSERT
DROP TRIGGER IF EXISTS auto_fill_probation_start_trigger ON employees;
CREATE TRIGGER auto_fill_probation_start_trigger
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION auto_fill_probation_start_date();

-- =============================================
-- TRIGGER 2: Tự động điền ngày kết thúc thử việc và ngày chính thức khi chuyển chức vụ
-- =============================================
CREATE OR REPLACE FUNCTION auto_complete_probation()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ xử lý khi UPDATE position_id
    IF TG_OP = 'UPDATE' AND OLD.position_id IS DISTINCT FROM NEW.position_id THEN
        
        -- Case 1: Chuyển TỪ position "Thử việc" SANG position khác
        IF OLD.position_id IS NOT NULL AND is_probation_position(OLD.position_id) AND 
           (NEW.position_id IS NULL OR NOT is_probation_position(NEW.position_id)) THEN
            
            -- Tự động điền probation_end_date = ngày hiện tại nếu chưa có
            IF NEW.probation_end_date IS NULL THEN
                NEW.probation_end_date := CURRENT_DATE;
            END IF;
            
            -- Tự động điền official_start_date = ngày hiện tại nếu chưa có
            IF NEW.official_start_date IS NULL THEN
                NEW.official_start_date := CURRENT_DATE;
            END IF;
            
            -- Cập nhật probation_result = "Đạt" nếu chưa có hoặc đang là "Đang thử việc"
            IF NEW.probation_result IS NULL OR NEW.probation_result = '' OR NEW.probation_result = 'Đang thử việc' THEN
                NEW.probation_result := 'Đạt';
            END IF;
            
        -- Case 2: Chuyển SANG position "Thử việc" (trường hợp đặc biệt)
        ELSIF NEW.position_id IS NOT NULL AND is_probation_position(NEW.position_id) AND 
              (OLD.position_id IS NULL OR NOT is_probation_position(OLD.position_id)) THEN
            
            -- Reset thông tin thử việc cho lần thử việc mới
            IF NEW.probation_start_date IS NULL THEN
                NEW.probation_start_date := CURRENT_DATE;
            END IF;
            
            -- Clear thông tin kết thúc thử việc và ngày chính thức (vì bắt đầu thử việc mới)
            NEW.probation_end_date := NULL;
            NEW.official_start_date := NULL;
            NEW.probation_result := 'Đang thử việc';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho UPDATE
DROP TRIGGER IF EXISTS auto_complete_probation_trigger ON employees;
CREATE TRIGGER auto_complete_probation_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION auto_complete_probation();

-- =============================================
-- TRIGGER 3: Validation để đảm bảo tính nhất quán dữ liệu
-- =============================================
CREATE OR REPLACE FUNCTION validate_probation_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validation 1: Nếu đang ở position "Thử việc" thì không được có official_start_date
    IF NEW.position_id IS NOT NULL AND is_probation_position(NEW.position_id) THEN
        IF NEW.official_start_date IS NOT NULL THEN
            RAISE EXCEPTION 'Nhân viên thử việc không thể có ngày bắt đầu chính thức';
        END IF;
    END IF;
    
    -- Validation 2: probation_end_date phải sau probation_start_date
    IF NEW.probation_start_date IS NOT NULL AND NEW.probation_end_date IS NOT NULL THEN
        IF NEW.probation_end_date < NEW.probation_start_date THEN
            RAISE EXCEPTION 'Ngày kết thúc thử việc phải sau ngày bắt đầu thử việc';
        END IF;
    END IF;
    
    -- Validation 3: official_start_date phải sau hoặc bằng probation_end_date
    IF NEW.probation_end_date IS NOT NULL AND NEW.official_start_date IS NOT NULL THEN
        IF NEW.official_start_date < NEW.probation_end_date THEN
            RAISE EXCEPTION 'Ngày bắt đầu chính thức phải sau hoặc bằng ngày kết thúc thử việc';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo validation trigger (chạy sau cùng)
DROP TRIGGER IF EXISTS validate_probation_data_trigger ON employees;
CREATE TRIGGER validate_probation_data_trigger
    BEFORE INSERT OR UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION validate_probation_data();

-- =============================================
-- HELPER FUNCTIONS cho reporting
-- =============================================

-- Function để lấy danh sách nhân viên đang thử việc
CREATE OR REPLACE FUNCTION get_probation_employees()
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(255),
    employee_code VARCHAR(50),
    probation_start_date DATE,
    days_in_probation INTEGER,
    department_name VARCHAR(255),
    manager_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.employee_code,
        e.probation_start_date,
        CASE 
            WHEN e.probation_start_date IS NOT NULL 
            THEN CURRENT_DATE - e.probation_start_date 
            ELSE NULL 
        END as days_in_probation,
        d.name as department_name,
        m.name as manager_name
    FROM employees e
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN employees m ON e.manager_id = m.id
    WHERE p.name = 'Thử việc' 
    AND e.status = 'active'
    ORDER BY e.probation_start_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function để lấy lịch sử thử việc của nhân viên
CREATE OR REPLACE FUNCTION get_employee_probation_history(emp_id UUID)
RETURNS TABLE (
    employee_name VARCHAR(255),
    probation_start_date DATE,
    probation_end_date DATE,
    probation_result VARCHAR(50),
    official_start_date DATE,
    probation_duration INTEGER,
    current_position VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.name as employee_name,
        e.probation_start_date,
        e.probation_end_date,
        e.probation_result,
        e.official_start_date,
        CASE 
            WHEN e.probation_start_date IS NOT NULL AND e.probation_end_date IS NOT NULL
            THEN e.probation_end_date - e.probation_start_date 
            ELSE NULL 
        END as probation_duration,
        p.name as current_position
    FROM employees e
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.id = emp_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS và DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION get_probation_position_id() IS 'Lấy ID của position "Thử việc"';
COMMENT ON FUNCTION is_probation_position(UUID) IS 'Kiểm tra xem position có phải là "Thử việc" không';
COMMENT ON FUNCTION auto_fill_probation_start_date() IS 'Tự động điền ngày bắt đầu thử việc khi tạo nhân viên thử việc';
COMMENT ON FUNCTION auto_complete_probation() IS 'Tự động hoàn thành thông tin thử việc khi chuyển chức vụ';
COMMENT ON FUNCTION validate_probation_data() IS 'Validation dữ liệu thử việc để đảm bảo tính nhất quán';
COMMENT ON FUNCTION get_probation_employees() IS 'Lấy danh sách nhân viên đang thử việc';
COMMENT ON FUNCTION get_employee_probation_history(UUID) IS 'Lấy lịch sử thử việc của nhân viên cụ thể';

-- =============================================
-- TEST DATA và EXAMPLES
-- =============================================

-- Test case examples (comment out để không chạy tự động):
/*
-- Test 1: Tạo nhân viên thử việc mới
INSERT INTO employees (employee_code, email, name, start_date, position_id, status)
SELECT 'TV001', 'test@example.com', 'Nguyen Van Test', CURRENT_DATE, id, 'active'
FROM positions WHERE name = 'Thử việc' LIMIT 1;

-- Test 2: Chuyển nhân viên từ thử việc sang chính thức
UPDATE employees 
SET position_id = (SELECT id FROM positions WHERE name = 'Developer' LIMIT 1)
WHERE employee_code = 'TV001';

-- Test 3: Kiểm tra kết quả
SELECT * FROM get_employee_probation_history(
    (SELECT id FROM employees WHERE employee_code = 'TV001')
);
*/

-- =============================================
-- Kết thúc file triggers
-- =============================================