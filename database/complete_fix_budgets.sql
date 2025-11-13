-- Complete fix for budgets system
-- Run this to fix all budget-related issues

-- 1. Add missing columns to budgets table
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES budget_categories(id),
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Create budget_allocations table with correct relationships
DROP TABLE IF EXISTS budget_allocations CASCADE;

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
    UNIQUE(budget_id, category_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(year, period_type, period_value);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget_id ON budget_allocations(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_category_id ON budget_allocations(category_id);

-- 4. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_budget_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_budget_allocations_updated_at ON budget_allocations;
CREATE TRIGGER update_budget_allocations_updated_at
    BEFORE UPDATE ON budget_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_allocations_updated_at();

-- 5. Enable RLS and create policies
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_allocations_select" ON budget_allocations;
CREATE POLICY "budget_allocations_select" ON budget_allocations FOR SELECT USING (true);

DROP POLICY IF EXISTS "budget_allocations_insert" ON budget_allocations;
CREATE POLICY "budget_allocations_insert" ON budget_allocations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "budget_allocations_update" ON budget_allocations;
CREATE POLICY "budget_allocations_update" ON budget_allocations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "budget_allocations_delete" ON budget_allocations;
CREATE POLICY "budget_allocations_delete" ON budget_allocations FOR DELETE USING (true);

-- 6. Verify the setup
SELECT 
    'budgets table' as table_name,
    count(*) as row_count
FROM budgets
UNION ALL
SELECT 
    'budget_categories table' as table_name,
    count(*) as row_count
FROM budget_categories
UNION ALL
SELECT 
    'budget_allocations table' as table_name,
    count(*) as row_count
FROM budget_allocations;

SELECT '✅ Complete fix applied successfully!' as result;
