-- Migration: Add team_leader and office_manager roles
-- Date: 2025-12-06

-- Update AppRole enum to include new roles
DO $$ BEGIN
    -- Add new roles to enum if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'team_leader' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'team_leader';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'office_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'office_manager';
    END IF;
END $$;

-- Add office_manager_id to offices table for office manager relationship
ALTER TABLE public.offices 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_offices_manager_id ON public.offices(manager_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(leader_id);

-- Update RLS policies to allow team leaders to see their team data
CREATE POLICY IF NOT EXISTS "Team leaders can view their team"
ON public.teams FOR SELECT
TO authenticated
USING (
  leader_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'office_manager')
);

-- Update RLS policies to allow office managers to see their office data
CREATE POLICY IF NOT EXISTS "Office managers can view their office"
ON public.offices FOR SELECT
TO authenticated
USING (
  manager_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

-- Allow team leaders to view realtors in their team
CREATE POLICY IF NOT EXISTS "Team leaders can view team realtors"
ON public.realtors FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT id FROM public.teams WHERE leader_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'office_manager')
);

-- Allow team leaders and office managers to view training progress
CREATE POLICY IF NOT EXISTS "Team leaders and office managers can view training progress"
ON public.training_progress FOR SELECT
TO authenticated
USING (
  realtor_id IN (
    SELECT r.id FROM public.realtors r
    JOIN public.teams t ON r.team_id = t.id
    WHERE t.leader_id = auth.uid()
  ) OR
  realtor_id IN (
    SELECT r.id FROM public.realtors r
    JOIN public.teams t ON r.team_id = t.id
    JOIN public.offices o ON t.office_id = o.id
    WHERE o.manager_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Allow team leaders and office managers to update training progress
CREATE POLICY IF NOT EXISTS "Team leaders and office managers can update training progress"
ON public.training_progress FOR UPDATE
TO authenticated
USING (
  realtor_id IN (
    SELECT r.id FROM public.realtors r
    JOIN public.teams t ON r.team_id = t.id
    WHERE t.leader_id = auth.uid()
  ) OR
  realtor_id IN (
    SELECT r.id FROM public.realtors r
    JOIN public.teams t ON r.team_id = t.id
    JOIN public.offices o ON t.office_id = o.id
    WHERE o.manager_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Allow realtors to update their own training progress
CREATE POLICY IF NOT EXISTS "Realtors can update own training progress"
ON public.training_progress FOR UPDATE
TO authenticated
USING (
  realtor_id IN (
    SELECT id FROM public.realtors WHERE user_id = auth.uid()
  )
);

-- Comments
COMMENT ON COLUMN public.offices.manager_id IS 'ID of the office manager (profile)';
COMMENT ON TYPE app_role IS 'User roles: admin, realtor, team_leader, office_manager';

