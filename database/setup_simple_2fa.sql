-- Setup Simple 2FA Tables for Supabase
-- Run this in Supabase SQL Editor

-- Create simple 2FA factors table
CREATE TABLE IF NOT EXISTS user_2fa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    friendly_name TEXT NOT NULL,
    factor_type TEXT NOT NULL DEFAULT 'totp',
    status TEXT NOT NULL DEFAULT 'unverified',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simple 2FA challenges table
CREATE TABLE IF NOT EXISTS user_2fa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_id UUID NOT NULL REFERENCES user_2fa_factors(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET
);

-- Enable RLS
ALTER TABLE user_2fa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for user_2fa_factors
DROP POLICY IF EXISTS "Users can view their own 2FA factors" ON user_2fa_factors;
CREATE POLICY "Users can view their own 2FA factors" ON user_2fa_factors
FOR SELECT USING (
    user_id IN (
        SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their own 2FA factors" ON user_2fa_factors;
CREATE POLICY "Users can insert their own 2FA factors" ON user_2fa_factors
FOR INSERT WITH CHECK (
    user_id IN (
        SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their own 2FA factors" ON user_2fa_factors;
CREATE POLICY "Users can update their own 2FA factors" ON user_2fa_factors
FOR UPDATE USING (
    user_id IN (
        SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their own 2FA factors" ON user_2fa_factors;
CREATE POLICY "Users can delete their own 2FA factors" ON user_2fa_factors
FOR DELETE USING (
    user_id IN (
        SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
);

-- Policies for user_2fa_challenges
DROP POLICY IF EXISTS "Users can view their own 2FA challenges" ON user_2fa_challenges;
CREATE POLICY "Users can view their own 2FA challenges" ON user_2fa_challenges
FOR SELECT USING (
    factor_id IN (
        SELECT id FROM user_2fa_factors 
        WHERE user_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert their own 2FA challenges" ON user_2fa_challenges;
CREATE POLICY "Users can insert their own 2FA challenges" ON user_2fa_challenges
FOR INSERT WITH CHECK (
    factor_id IN (
        SELECT id FROM user_2fa_factors 
        WHERE user_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can update their own 2FA challenges" ON user_2fa_challenges;
CREATE POLICY "Users can update their own 2FA challenges" ON user_2fa_challenges
FOR UPDATE USING (
    factor_id IN (
        SELECT id FROM user_2fa_factors 
        WHERE user_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    )
);

-- Grant permissions
GRANT ALL ON user_2fa_factors TO authenticated;
GRANT ALL ON user_2fa_challenges TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_2fa_factors_user_id ON user_2fa_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_challenges_factor_id ON user_2fa_challenges(factor_id); 