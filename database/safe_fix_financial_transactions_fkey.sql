-- Safe fix for financial_transactions foreign key constraint
-- This handles existing data and migrates safely

-- Step 1: Check existing data and constraints
DO $$
DECLARE
    existing_count INTEGER;
    invalid_count INTEGER;
BEGIN
    -- Count existing financial_transactions
    SELECT COUNT(*) INTO existing_count FROM financial_transactions;
    RAISE NOTICE 'Found % existing financial transactions', existing_count;
    
    -- Count transactions with invalid category_id (if any)
    SELECT COUNT(*) INTO invalid_count 
    FROM financial_transactions ft 
    WHERE ft.category_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM budget_categories bc WHERE bc.id = ft.category_id
    );
    RAISE NOTICE 'Found % transactions with invalid category_id', invalid_count;
    
    -- If we have invalid data, we need to handle it
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Will set invalid category_id to NULL before applying constraint';
        
        -- Set invalid category_id to NULL
        UPDATE financial_transactions 
        SET category_id = NULL 
        WHERE category_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM budget_categories bc WHERE bc.id = category_id
        );
        
        RAISE NOTICE 'Updated % invalid category_id to NULL', invalid_count;
    END IF;
END $$;

-- Step 2: Drop existing foreign key constraint
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_category_id_fkey;

-- Step 3: Allow NULL values for category_id (temporary for migration)
ALTER TABLE financial_transactions 
ALTER COLUMN category_id DROP NOT NULL;

-- Step 4: Create new foreign key constraint pointing to budget_categories
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL;

-- Step 5: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category_id 
ON financial_transactions(category_id);

-- Step 6: Verify the new constraint works
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'financial_transactions_category_id_fkey'
        AND table_name = 'financial_transactions'
        AND constraint_type = 'FOREIGN KEY'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '✅ Foreign key constraint successfully created';
    ELSE
        RAISE NOTICE '❌ Failed to create foreign key constraint';
    END IF;
END $$;

-- Step 7: Show constraint details
SELECT 
    'financial_transactions.category_id → budget_categories.id' as constraint_details,
    'ON DELETE SET NULL' as delete_action,
    'Ready for budget_categories integration' as status;

-- Optional: If you want to migrate existing financial_categories to budget_categories
-- Uncomment below if needed:

/*
-- Migrate existing financial_categories to budget_categories (if needed)
INSERT INTO budget_categories (id, code, name, category_type, level, sort_order, description, is_active)
SELECT 
    id,
    COALESCE(code, 'FC' || ROW_NUMBER() OVER (ORDER BY id)) as code,
    name,
    CASE 
        WHEN type = 'income' THEN 2 
        ELSE 1 
    END as category_type,
    0 as level,
    ROW_NUMBER() OVER (ORDER BY name) as sort_order,
    description,
    true as is_active
FROM financial_categories fc
WHERE NOT EXISTS (
    SELECT 1 FROM budget_categories bc WHERE bc.id = fc.id
)
ON CONFLICT (id) DO NOTHING;
*/
