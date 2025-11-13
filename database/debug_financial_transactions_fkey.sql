-- Debug and fix financial_transactions foreign key constraint issue
-- This will identify the problem and fix it safely

-- Step 1: Check what's in financial_transactions
SELECT 
    'financial_transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(category_id) as records_with_category_id,
    COUNT(*) - COUNT(category_id) as records_without_category_id
FROM financial_transactions;

-- Step 2: Check what's in budget_categories
SELECT 
    'budget_categories' as table_name,
    COUNT(*) as total_categories,
    COUNT(DISTINCT id) as unique_ids
FROM budget_categories;

-- Step 3: Find invalid category_id references
SELECT 
    ft.id as transaction_id,
    ft.category_id,
    ft.description,
    ft.created_at,
    CASE 
        WHEN bc.id IS NULL THEN '❌ NOT FOUND in budget_categories'
        ELSE '✅ EXISTS in budget_categories'
    END as status
FROM financial_transactions ft
LEFT JOIN budget_categories bc ON ft.category_id = bc.id
WHERE ft.category_id IS NOT NULL
ORDER BY ft.created_at DESC;

-- Step 4: Show sample budget_categories IDs for reference
SELECT 
    'Sample budget_categories IDs:' as info,
    id,
    code,
    name,
    category_type
FROM budget_categories 
ORDER BY code 
LIMIT 10;

-- Step 5: Fix invalid references by setting them to NULL
UPDATE financial_transactions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM budget_categories bc WHERE bc.id = financial_transactions.category_id
);

-- Step 6: Verify fix
SELECT 
    'After fix - financial_transactions with valid category_id:' as status,
    COUNT(*) as valid_references
FROM financial_transactions ft
INNER JOIN budget_categories bc ON ft.category_id = bc.id;

-- Step 7: Show final state
SELECT 
    'Final state:' as info,
    COUNT(*) as total_transactions,
    COUNT(category_id) as transactions_with_category,
    COUNT(*) - COUNT(category_id) as transactions_without_category
FROM financial_transactions;

-- Step 8: Test constraint
DO $$
DECLARE
    constraint_works BOOLEAN;
BEGIN
    -- Try to insert a test transaction with valid category_id
    BEGIN
        INSERT INTO financial_transactions (
            description, 
            amount, 
            transaction_type, 
            category_id, 
            payment_method,
            date
        ) VALUES (
            'TEST TRANSACTION - DELETE ME',
            100,
            'expense',
            (SELECT id FROM budget_categories LIMIT 1),
            'cash',
            CURRENT_DATE
        );
        
        -- If we get here, constraint works
        constraint_works := TRUE;
        
        -- Clean up test data
        DELETE FROM financial_transactions 
        WHERE description = 'TEST TRANSACTION - DELETE ME';
        
        RAISE NOTICE '✅ Foreign key constraint is working correctly';
    EXCEPTION 
        WHEN OTHERS THEN
            constraint_works := FALSE;
            RAISE NOTICE '❌ Foreign key constraint still has issues: %', SQLERRM;
    END;
END $$;
