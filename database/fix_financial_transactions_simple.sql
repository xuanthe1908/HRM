-- Simple fix for financial_transactions foreign key constraint
-- Drop the old foreign key constraint
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_category_id_fkey;

-- Add new foreign key constraint to budget_categories
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL;

-- Update any existing invalid references to NULL
UPDATE financial_transactions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM budget_categories bc WHERE bc.id = financial_transactions.category_id
);
