-- Kiểm tra xem vị trí "Thử việc" đã tồn tại chưa, nếu chưa thì thêm mới
INSERT INTO public.positions (name, description, created_at, updated_at)
SELECT 'Thử việc', 'Nhân viên đang trong thời gian thử việc', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.positions WHERE name = 'Thử việc'
);

-- Kiểm tra kết quả
SELECT id, name, description FROM public.positions WHERE name = 'Thử việc';