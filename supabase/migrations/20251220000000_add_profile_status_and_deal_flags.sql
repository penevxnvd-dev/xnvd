-- Migration: Add status and inactivity_reason to profiles table, and is_key/is_exclusive to deals table
-- Date: 2025-12-20

-- Add status and inactivity_reason columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS inactivity_reason TEXT;

-- Add check constraint for status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_status_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

-- Add is_key and is_exclusive columns to deals table
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS is_key BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- Add RLS policy for profiles table to allow authenticated users to update their own status and inactivity reason
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Allow authenticated users to update own status'
    ) THEN
        CREATE POLICY "Allow authenticated users to update own status"
        ON public.profiles FOR UPDATE TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Comments
COMMENT ON COLUMN public.profiles.status IS 'Account status: active or inactive';
COMMENT ON COLUMN public.profiles.inactivity_reason IS 'Reason for account inactivity (required when status is inactive)';
COMMENT ON COLUMN public.deals.is_key IS 'Whether this deal is a key deal';
COMMENT ON COLUMN public.deals.is_exclusive IS 'Whether this deal is exclusive';
