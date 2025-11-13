-- Add allocated_amount column to budgets table
-- This column stores the budget allocation amount for each category

-- Add the allocated_amount column
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(15,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN budgets.allocated_amount IS 'Số tiền dự toán được phân bổ cho danh mục này';

-- Add category_id and category_name columns if they don't exist
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES budget_categories(id),
ADD COLUMN IF NOT EXISTS category_name TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN budgets.category_id IS 'ID của danh mục ngân sách liên kết';
COMMENT ON COLUMN budgets.category_name IS 'Tên danh mục ngân sách (để tránh JOIN)';

-- Add description column if it doesn't exist
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN budgets.description IS 'Mô tả chi tiết về dự toán này';

-- Create index for better performance on category lookups
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(year, period_type, period_value);

-- Display result
SELECT 'Đã thêm thành công các cột: allocated_amount, category_id, category_name, description vào bảng budgets' as result;
