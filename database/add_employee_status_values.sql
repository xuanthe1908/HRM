-- Add new values to employee_status enum: invite_sent, pending
-- Safe to run multiple times using IF NOT EXISTS guards

DO $$
BEGIN
  -- Add 'invite_sent'
  BEGIN
    ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'invite_sent';
  EXCEPTION
    WHEN others THEN NULL;
  END;

  -- Add 'pending'
  BEGIN
    ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'pending';
  EXCEPTION
    WHEN others THEN NULL;
  END;
END $$;



