-- Fix 2FA Database Schema
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing table if it exists
DROP TABLE IF EXISTS user_2fa_factors CASCADE;
DROP TABLE IF EXISTS user_2fa_challenges CASCADE;
DROP TABLE IF EXISTS user_2fa_attempts CASCADE;

-- Step 2: Create 2FA factors table with correct schema
CREATE TABLE user_2fa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    friendly_name TEXT NOT NULL,
    factor_type TEXT NOT NULL DEFAULT 'totp',
    status TEXT NOT NULL DEFAULT 'unverified',
    secret TEXT, -- Secret key cho TOTP
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create 2FA challenges table
CREATE TABLE user_2fa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_id UUID NOT NULL REFERENCES user_2fa_factors(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET
);

-- Step 4: Create 2FA attempts log table
CREATE TABLE user_2fa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('setup', 'verify', 'disable')),
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes
CREATE INDEX idx_user_2fa_factors_user_id ON user_2fa_factors(user_id);
CREATE INDEX idx_user_2fa_factors_status ON user_2fa_factors(status);
CREATE INDEX idx_user_2fa_challenges_factor_id ON user_2fa_challenges(factor_id);
CREATE INDEX idx_user_2fa_attempts_user_id ON user_2fa_attempts(user_id);

-- Step 6: Grant permissions
GRANT ALL ON user_2fa_factors TO authenticated;
GRANT ALL ON user_2fa_challenges TO authenticated;
GRANT ALL ON user_2fa_attempts TO authenticated;

-- Step 7: Create functions
CREATE OR REPLACE FUNCTION log_2fa_attempt(
    p_user_id UUID,
    p_attempt_type TEXT,
    p_success BOOLEAN,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_2fa_attempts (
        user_id,
        attempt_type,
        success,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_attempt_type,
        p_success,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Step 8: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_2fa_factors_updated_at 
    BEFORE UPDATE ON user_2fa_factors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Test the setup
INSERT INTO user_2fa_factors (user_id, friendly_name, factor_type, secret) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Test 2FA', 'totp', 'JBSWY3DPEHPK3PXP');

-- Step 10: Verify setup
SELECT '2FA database fixed successfully' as status; 