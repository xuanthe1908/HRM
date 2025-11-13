-- Fix foreign key constraint for financial_transactions
-- Change from financial_categories to budget_categories

-- Step 1: Drop existing foreign key constraint
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_category_id_fkey;

-- Step 2: Create new foreign key constraint pointing to budget_categories
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES budget_categories(id);

-- Step 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category_id 
ON financial_transactions(category_id);

-- Step 4: Verify the constraint
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

-- Display result
SELECT 'Foreign key constraint updated: financial_transactions.category_id → budget_categories.id' as result;
