-- Script SQL để thêm phòng ban và chức vụ mới
-- Chạy trong Supabase SQL Editor

-- Thêm phòng ban mới
INSERT INTO departments (name, description) VALUES 
('Headhunter', 'Phòng ban chuyên về tuyển dụng và tìm kiếm nhân tài'),
('BD', 'Phòng ban Business Development - Phát triển kinh doanh')
ON CONFLICT (name) DO NOTHING;

-- Thêm chức vụ mới
INSERT INTO positions (name, description) VALUES 
('Chuyên Viên', 'Chuyên viên trong các lĩnh vực chuyên môn'),
('Intern', 'Thực tập sinh')
ON CONFLICT (name, department_id) DO NOTHING;

-- Hiển thị kết quả
SELECT 'Phòng ban hiện có:' as info;
SELECT id, name, description FROM departments ORDER BY name;

SELECT 'Chức vụ hiện có:' as info;
SELECT id, name, description, department_id FROM positions ORDER BY name; 