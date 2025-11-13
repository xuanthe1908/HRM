-- Setup 2FA Functions for Supabase
-- Run this in Supabase SQL Editor

-- Function to create MFA factor
CREATE OR REPLACE FUNCTION create_mfa_factor(
  user_id UUID,
  friendly_name TEXT,
  factor_type TEXT DEFAULT 'totp'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  factor_record JSONB;
BEGIN
  -- Insert new MFA factor
  INSERT INTO auth.mfa_factors (
    id,
    user_id,
    friendly_name,
    factor_type,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    user_id,
    friendly_name,
    factor_type::auth.factor_type,
    'unverified'::auth.factor_status,
    NOW(),
    NOW()
  ) RETURNING to_jsonb(auth.mfa_factors.*) INTO factor_record;
  
  RETURN factor_record;
END;
$$;

-- Function to delete MFA factor
CREATE OR REPLACE FUNCTION delete_mfa_factor(
  user_id UUID,
  factor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete MFA factor
  DELETE FROM auth.mfa_factors 
  WHERE id = factor_id AND user_id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to verify MFA factor
CREATE OR REPLACE FUNCTION verify_mfa_factor(
  user_id UUID,
  factor_id UUID,
  challenge_id UUID,
  code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  challenge_record RECORD;
BEGIN
  -- Get challenge record
  SELECT * INTO challenge_record 
  FROM auth.mfa_challenges 
  WHERE id = challenge_id AND factor_id = factor_id;
  
  -- Verify code (simplified - in real implementation, you'd verify TOTP)
  IF challenge_record.otp_code = code THEN
    -- Update factor status to verified
    UPDATE auth.mfa_factors 
    SET status = 'verified'::auth.factor_status,
        updated_at = NOW()
    WHERE id = factor_id;
    
    -- Update challenge as verified
    UPDATE auth.mfa_challenges 
    SET verified_at = NOW()
    WHERE id = challenge_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_mfa_factor(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_mfa_factor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_mfa_factor(UUID, UUID, UUID, TEXT) TO authenticated;

-- Create challenge function
CREATE OR REPLACE FUNCTION create_mfa_challenge(
  user_id UUID,
  factor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  challenge_record JSONB;
  otp_code TEXT;
BEGIN
  -- Generate OTP code (6 digits)
  otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Insert challenge
  INSERT INTO auth.mfa_challenges (
    id,
    factor_id,
    created_at,
    ip_address,
    otp_code
  ) VALUES (
    gen_random_uuid(),
    factor_id,
    NOW(),
    inet_client_addr(),
    otp_code
  ) RETURNING to_jsonb(auth.mfa_challenges.*) INTO challenge_record;
  
  RETURN challenge_record;
END;
$$;

GRANT EXECUTE ON FUNCTION create_mfa_challenge(UUID, UUID) TO authenticated; 