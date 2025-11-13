-- Final fix for financial_transactions to use budget_categories
-- Step 1: Drop the old foreign key constraint
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_category_id_fkey;

-- Step 2: Clean up any invalid category_id references
UPDATE financial_transactions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM budget_categories bc WHERE bc.id = financial_transactions.category_id
);

-- Step 3: Add new foreign key constraint to budget_categories
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL;

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category_id 
ON financial_transactions(category_id);

-- Step 5: Verify the fix
SELECT 
    'Foreign key constraint updated successfully' as status,
    COUNT(*) as total_transactions,
    COUNT(category_id) as transactions_with_category,
    COUNT(*) - COUNT(category_id) as transactions_without_category
FROM financial_transactions;
