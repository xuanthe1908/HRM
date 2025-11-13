-- Migration: Thêm các trường thông tin chi tiết cho employees
-- Dựa trên file CSV "Thông tin nhân viên (Demo).csv"

-- Thêm các trường mới vào bảng employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(10); -- Nam/Nữ
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50); -- Tình trạng hôn nhân
ALTER TABLE employees ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0; -- Số người con
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ethnicity VARCHAR(50); -- Dân tộc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(50); -- Tôn giáo
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Việt Nam'; -- Quốc tịch
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_number VARCHAR(20); -- Số CCCD/Số hộ chiếu
ALTER TABLE employees ADD COLUMN IF NOT EXISTS social_insurance_number VARCHAR(20); -- Số BHXH
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_code VARCHAR(20); -- Mã số thuế
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education_level VARCHAR(100); -- Trình độ học vấn
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255); -- Email cá nhân
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permanent_address TEXT; -- Địa chỉ thường trú
ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_address TEXT; -- Địa chỉ tạm trú
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50); -- Số tài khoản
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100); -- Ngân hàng
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_start_date DATE; -- Ngày thử việc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_end_date DATE; -- Ngày kết thúc thử việc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_result VARCHAR(50); -- Kết quả thử việc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS related_files TEXT[]; -- Hồ sơ liên quan
ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_start_date DATE; -- Ngày chính thức
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100); -- Loại hợp đồng
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_end_date DATE; -- Ngày hết hạn hợp đồng
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_file_url TEXT; -- Link file hợp đồng
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_date DATE; -- Ngày nghỉ việc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_reason TEXT; -- Lý do nghỉ việc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT; -- Ảnh nhân viên
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_front_url TEXT; -- Ảnh chụp CCCD (mặt trước)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_back_url TEXT; -- Ảnh chụp CCCD (mặt sau)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_permit_url TEXT; -- Scan Giấy phép lao động
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_leave_hours INTEGER DEFAULT 0; -- Tổng số giờ nghỉ
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_insurance_amount DECIMAL(15,2) DEFAULT 0; -- BH công ty đóng
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_insurance_amount DECIMAL(15,2) DEFAULT 0; -- BH nhân viên đóng
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_deduction DECIMAL(15,2) DEFAULT 11000000; -- Giảm trừ gia cảnh
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT 'Luỹ tiến'; -- Loại thuế
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_history TEXT; -- Lịch sử lương
ALTER TABLE employees ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50); -- Chấm công
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_level VARCHAR(50); -- Cấp bậc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_position VARCHAR(100); -- Vị trí công việc
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_name VARCHAR(255); -- Phòng ban
ALTER TABLE employees ADD COLUMN IF NOT EXISTS direct_manager VARCHAR(255); -- Quản lý trực tiếp
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255); -- Email Quản lý trực tiếp
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_issue_date DATE; -- Ngày cấp CCCD
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_issue_place VARCHAR(255); -- Nơi cấp CCCD
ALTER TABLE employees ADD COLUMN IF NOT EXISTS health_insurance_place VARCHAR(255); -- Nơi đăng ký khám chữa bệnh ban đầu
ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferences TEXT; -- Sở thích
ALTER TABLE employees ADD COLUMN IF NOT EXISTS meal_allowance DECIMAL(15,2) DEFAULT 0; -- Phụ cấp ăn trưa
ALTER TABLE employees ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL(15,2) DEFAULT 0; -- Phụ cấp đi lại
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_allowance DECIMAL(15,2) DEFAULT 0; -- Phụ cấp điện thoại
ALTER TABLE employees ADD COLUMN IF NOT EXISTS attendance_allowance DECIMAL(15,2) DEFAULT 0; -- Phụ cấp chuyên cần
ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_days_used INTEGER DEFAULT 0; -- Xin nghỉ phép

-- Thêm comment cho các trường mới
COMMENT ON COLUMN employees.gender IS 'Giới tính: Nam/Nữ';
COMMENT ON COLUMN employees.marital_status IS 'Tình trạng hôn nhân';
COMMENT ON COLUMN employees.children_count IS 'Số người con';
COMMENT ON COLUMN employees.ethnicity IS 'Dân tộc';
COMMENT ON COLUMN employees.religion IS 'Tôn giáo';
COMMENT ON COLUMN employees.nationality IS 'Quốc tịch';
COMMENT ON COLUMN employees.id_number IS 'Số CCCD/Số hộ chiếu';
COMMENT ON COLUMN employees.social_insurance_number IS 'Số BHXH';
COMMENT ON COLUMN employees.tax_code IS 'Mã số thuế';
COMMENT ON COLUMN employees.education_level IS 'Trình độ học vấn';
COMMENT ON COLUMN employees.personal_email IS 'Email cá nhân';
COMMENT ON COLUMN employees.permanent_address IS 'Địa chỉ thường trú';
COMMENT ON COLUMN employees.current_address IS 'Địa chỉ tạm trú';
COMMENT ON COLUMN employees.bank_account IS 'Số tài khoản';
COMMENT ON COLUMN employees.bank_name IS 'Ngân hàng';
COMMENT ON COLUMN employees.probation_start_date IS 'Ngày thử việc';
COMMENT ON COLUMN employees.probation_end_date IS 'Ngày kết thúc thử việc';
COMMENT ON COLUMN employees.probation_result IS 'Kết quả thử việc';
COMMENT ON COLUMN employees.related_files IS 'Hồ sơ liên quan';
COMMENT ON COLUMN employees.official_start_date IS 'Ngày chính thức';
COMMENT ON COLUMN employees.contract_type IS 'Loại hợp đồng';
COMMENT ON COLUMN employees.contract_end_date IS 'Ngày hết hạn hợp đồng';
COMMENT ON COLUMN employees.contract_file_url IS 'Link file hợp đồng';
COMMENT ON COLUMN employees.termination_date IS 'Ngày nghỉ việc';
COMMENT ON COLUMN employees.termination_reason IS 'Lý do nghỉ việc';
COMMENT ON COLUMN employees.avatar_url IS 'Ảnh nhân viên';
COMMENT ON COLUMN employees.id_card_front_url IS 'Ảnh chụp CCCD (mặt trước)';
COMMENT ON COLUMN employees.id_card_back_url IS 'Ảnh chụp CCCD (mặt sau)';
COMMENT ON COLUMN employees.work_permit_url IS 'Scan Giấy phép lao động';
COMMENT ON COLUMN employees.total_leave_hours IS 'Tổng số giờ nghỉ';
COMMENT ON COLUMN employees.company_insurance_amount IS 'BH công ty đóng';
COMMENT ON COLUMN employees.employee_insurance_amount IS 'BH nhân viên đóng';
COMMENT ON COLUMN employees.personal_deduction IS 'Giảm trừ gia cảnh';
COMMENT ON COLUMN employees.tax_type IS 'Loại thuế';
COMMENT ON COLUMN employees.salary_history IS 'Lịch sử lương';
COMMENT ON COLUMN employees.attendance_status IS 'Chấm công';
COMMENT ON COLUMN employees.job_level IS 'Cấp bậc';
COMMENT ON COLUMN employees.job_position IS 'Vị trí công việc';
COMMENT ON COLUMN employees.department_name IS 'Phòng ban';
COMMENT ON COLUMN employees.direct_manager IS 'Quản lý trực tiếp';
COMMENT ON COLUMN employees.manager_email IS 'Email Quản lý trực tiếp';
COMMENT ON COLUMN employees.id_card_issue_date IS 'Ngày cấp CCCD';
COMMENT ON COLUMN employees.id_card_issue_place IS 'Nơi cấp CCCD';
COMMENT ON COLUMN employees.health_insurance_place IS 'Nơi đăng ký khám chữa bệnh ban đầu';
COMMENT ON COLUMN employees.preferences IS 'Sở thích';
COMMENT ON COLUMN employees.meal_allowance IS 'Phụ cấp ăn trưa';
COMMENT ON COLUMN employees.transport_allowance IS 'Phụ cấp đi lại';
COMMENT ON COLUMN employees.phone_allowance IS 'Phụ cấp điện thoại';
COMMENT ON COLUMN employees.attendance_allowance IS 'Phụ cấp chuyên cần';
COMMENT ON COLUMN employees.leave_days_used IS 'Xin nghỉ phép';

-- Tạo index cho các trường thường được tìm kiếm
CREATE INDEX IF NOT EXISTS idx_employees_id_number ON employees(id_number);
CREATE INDEX IF NOT EXISTS idx_employees_social_insurance_number ON employees(social_insurance_number);
CREATE INDEX IF NOT EXISTS idx_employees_tax_code ON employees(tax_code);
CREATE INDEX IF NOT EXISTS idx_employees_bank_account ON employees(bank_account);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status); 