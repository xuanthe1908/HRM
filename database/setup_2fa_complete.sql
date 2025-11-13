-- Complete 2FA Setup for HRM System
-- Run this in Supabase SQL Editor

-- 1. Create 2FA Factors Table
CREATE TABLE IF NOT EXISTS user_2fa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    friendly_name TEXT NOT NULL,
    factor_type TEXT NOT NULL DEFAULT 'totp',
    status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified')),
    secret TEXT, -- Secret key cho TOTP
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create 2FA Challenges Table
CREATE TABLE IF NOT EXISTS user_2fa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_id UUID NOT NULL REFERENCES user_2fa_factors(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET
);

-- 3. Create 2FA Attempts Log Table
CREATE TABLE IF NOT EXISTS user_2fa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('setup', 'verify', 'disable')),
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_user_2fa_factors_user_id ON user_2fa_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_factors_status ON user_2fa_factors(status);
CREATE INDEX IF NOT EXISTS idx_user_2fa_challenges_factor_id ON user_2fa_challenges(factor_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_user_id ON user_2fa_attempts(user_id);

-- 5. Grant Permissions (No RLS for simplicity)
GRANT ALL ON user_2fa_factors TO authenticated;
GRANT ALL ON user_2fa_challenges TO authenticated;
GRANT ALL ON user_2fa_attempts TO authenticated;

-- 6. Create Functions

-- Function to log 2FA attempts
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

-- Function to create 2FA factor
CREATE OR REPLACE FUNCTION create_2fa_factor(
    p_user_id UUID,
    p_friendly_name TEXT,
    p_factor_type TEXT DEFAULT 'totp',
    p_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    factor_record JSONB;
BEGIN
    INSERT INTO user_2fa_factors (
        user_id,
        friendly_name,
        factor_type,
        status,
        secret
    ) VALUES (
        p_user_id,
        p_friendly_name,
        p_factor_type,
        'unverified',
        p_secret
    ) RETURNING to_jsonb(user_2fa_factors.*) INTO factor_record;
    
    RETURN factor_record;
END;
$$;

-- Function to verify 2FA factor
CREATE OR REPLACE FUNCTION verify_2fa_factor(
    p_factor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_2fa_factors 
    SET status = 'verified',
        updated_at = NOW()
    WHERE id = p_factor_id;
    
    RETURN FOUND;
END;
$$;

-- Function to delete 2FA factor
CREATE OR REPLACE FUNCTION delete_2fa_factor(
    p_user_id UUID,
    p_factor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_2fa_factors 
    WHERE id = p_factor_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- 7. Insert sample data for testing (optional)
-- INSERT INTO user_2fa_factors (user_id, friendly_name, factor_type, secret) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Test 2FA', 'totp', 'JBSWY3DPEHPK3PXP');

-- 8. Create trigger to update updated_at
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

-- 9. Verify setup
SELECT '2FA setup completed successfully' as status; 