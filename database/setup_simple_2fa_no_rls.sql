-- Setup Simple 2FA Tables for Supabase (No RLS)
-- Run this in Supabase SQL Editor

-- Create simple 2FA factors table
CREATE TABLE IF NOT EXISTS user_2fa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    friendly_name TEXT NOT NULL,
    factor_type TEXT NOT NULL DEFAULT 'totp',
    status TEXT NOT NULL DEFAULT 'unverified',
    secret TEXT, -- Secret key cho TOTP
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

-- Grant permissions (no RLS)
GRANT ALL ON user_2fa_factors TO authenticated;
GRANT ALL ON user_2fa_challenges TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_2fa_factors_user_id ON user_2fa_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_challenges_factor_id ON user_2fa_challenges(factor_id);

-- Insert test data (optional)
-- INSERT INTO user_2fa_factors (user_id, friendly_name, factor_type) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Test 2FA', 'totp'); 