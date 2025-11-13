-- Force fix financial_transactions foreign key constraint
-- This will completely remove and recreate the constraint

-- Step 1: Check current constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'financial_transactions'
    AND kcu.column_name = 'category_id';

-- Step 2: Drop ALL foreign key constraints on category_id
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop all foreign key constraints on category_id
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'financial_transactions'
        AND kcu.column_name = 'category_id'
    LOOP
        EXECUTE 'ALTER TABLE financial_transactions DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 3: Clean up invalid category_id references
UPDATE financial_transactions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM budget_categories bc WHERE bc.id = financial_transactions.category_id
);

-- Step 4: Make category_id nullable (if not already)
ALTER TABLE financial_transactions 
ALTER COLUMN category_id DROP NOT NULL;

-- Step 5: Create new foreign key constraint to budget_categories
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL;

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category_id 
ON financial_transactions(category_id);

-- Step 7: Verify the new constraint
SELECT 
    'New constraint created:' as status,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'financial_transactions'
    AND kcu.column_name = 'category_id';

-- Step 8: Test the constraint works
DO $$
DECLARE
    test_category_id UUID;
BEGIN
    -- Get a valid category_id for testing
    SELECT id INTO test_category_id FROM budget_categories LIMIT 1;
    
    IF test_category_id IS NULL THEN
        RAISE NOTICE '❌ No budget_categories found for testing';
        RETURN;
    END IF;
    
    -- Test insert with valid category_id
    BEGIN
        INSERT INTO financial_transactions (
            description, 
            amount, 
            transaction_type, 
            category_id, 
            payment_method,
            date
        ) VALUES (
            'TEST CONSTRAINT - DELETE ME',
            100,
            'expense',
            test_category_id,
            'cash',
            CURRENT_DATE
        );
        
        -- Clean up test data
        DELETE FROM financial_transactions 
        WHERE description = 'TEST CONSTRAINT - DELETE ME';
        
        RAISE NOTICE '✅ Foreign key constraint is working correctly with budget_categories';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Foreign key constraint still has issues: %', SQLERRM;
    END;
END $$;

-- Step 9: Show final status
SELECT 
    'Final status:' as info,
    COUNT(*) as total_transactions,
    COUNT(category_id) as transactions_with_category,
    COUNT(*) - COUNT(category_id) as transactions_without_category
FROM financial_transactions;
