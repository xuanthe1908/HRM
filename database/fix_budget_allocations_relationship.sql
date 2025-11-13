-- Fix budget_allocations table and relationships
-- This fixes the PGRST200 error: foreign key relationship not found

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS budget_allocations CASCADE;

-- Create budget_allocations table with correct foreign keys
CREATE TABLE budget_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    used_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (allocated_amount - used_amount) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique allocation per budget-category pair
    UNIQUE(budget_id, category_id)
);

-- Add comments for documentation
COMMENT ON TABLE budget_allocations IS 'Phân bổ ngân sách cho từng danh mục trong một budget cụ thể';
COMMENT ON COLUMN budget_allocations.budget_id IS 'ID của budget tổng thể';
COMMENT ON COLUMN budget_allocations.category_id IS 'ID của danh mục ngân sách';
COMMENT ON COLUMN budget_allocations.allocated_amount IS 'Số tiền được phân bổ';
COMMENT ON COLUMN budget_allocations.used_amount IS 'Số tiền đã sử dụng';
COMMENT ON COLUMN budget_allocations.remaining_amount IS 'Số tiền còn lại (auto calculated)';

-- Create indexes for better performance
CREATE INDEX idx_budget_allocations_budget_id ON budget_allocations(budget_id);
CREATE INDEX idx_budget_allocations_category_id ON budget_allocations(category_id);
CREATE INDEX idx_budget_allocations_created_at ON budget_allocations(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_budget_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_budget_allocations_updated_at ON budget_allocations;
CREATE TRIGGER update_budget_allocations_updated_at
    BEFORE UPDATE ON budget_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_allocations_updated_at();

-- Enable RLS if needed
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
DROP POLICY IF EXISTS "Users can view budget allocations" ON budget_allocations;
CREATE POLICY "Users can view budget allocations" 
    ON budget_allocations FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can insert budget allocations" ON budget_allocations;
CREATE POLICY "Users can insert budget allocations" 
    ON budget_allocations FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update budget allocations" ON budget_allocations;
CREATE POLICY "Users can update budget allocations" 
    ON budget_allocations FOR UPDATE 
    USING (true);

DROP POLICY IF EXISTS "Users can delete budget allocations" ON budget_allocations;
CREATE POLICY "Users can delete budget allocations" 
    ON budget_allocations FOR DELETE 
    USING (true);

-- Insert some sample data if budget_categories and budgets exist
DO $$
DECLARE
    sample_budget_id UUID;
    sample_category_id UUID;
BEGIN
    -- Get a sample budget and category
    SELECT id INTO sample_budget_id FROM budgets LIMIT 1;
    SELECT id INTO sample_category_id FROM budget_categories WHERE parent_id IS NULL LIMIT 1;
    
    -- Insert sample allocation if both exist
    IF sample_budget_id IS NOT NULL AND sample_category_id IS NOT NULL THEN
        INSERT INTO budget_allocations (budget_id, category_id, allocated_amount, notes)
        VALUES (sample_budget_id, sample_category_id, 10000000, 'Sample allocation for testing')
        ON CONFLICT (budget_id, category_id) DO NOTHING;
        
        RAISE NOTICE 'Sample budget allocation created';
    ELSE
        RAISE NOTICE 'No sample data created - missing budget or category';
    END IF;
END $$;

-- Display result
SELECT 'Đã tạo lại bảng budget_allocations với foreign key constraints đúng' as result;
