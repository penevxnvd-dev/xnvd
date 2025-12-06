-- Migration: Add regional_manager role and city manager relationship
-- Date: 2025-12-06

-- Update AppRole enum to include regional_manager
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'regional_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'regional_manager';
    END IF;
END $$;

-- Add manager_id to cities table for regional manager relationship
ALTER TABLE public.cities 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cities_manager_id ON public.cities(manager_id);

-- Update RLS policies to allow regional managers to see their cities
CREATE POLICY IF NOT EXISTS "Regional managers can view their cities"
ON public.cities FOR SELECT
TO authenticated
USING (
  manager_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

-- Allow regional managers to view offices in their cities
CREATE POLICY IF NOT EXISTS "Regional managers can view offices in their cities"
ON public.offices FOR SELECT
TO authenticated
USING (
  city_id IN (
    SELECT id FROM public.cities WHERE manager_id = auth.uid()
  ) OR
  manager_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

-- Allow regional managers to view teams in their cities
CREATE POLICY IF NOT EXISTS "Regional managers can view teams in their cities"
ON public.teams FOR SELECT
TO authenticated
USING (
  office_id IN (
    SELECT o.id FROM public.offices o
    JOIN public.cities c ON o.city_id = c.id
    WHERE c.manager_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'office_manager')
);

-- Allow regional managers to view realtors in their cities
CREATE POLICY IF NOT EXISTS "Regional managers can view realtors in their cities"
ON public.realtors FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT t.id FROM public.teams t
    JOIN public.offices o ON t.office_id = o.id
    JOIN public.cities c ON o.city_id = c.id
    WHERE c.manager_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'office_manager') OR
  public.has_role(auth.uid(), 'team_leader')
);

-- Allow regional managers to view training progress in their cities
CREATE POLICY IF NOT EXISTS "Regional managers can view training progress in their cities"
ON public.training_progress FOR SELECT
TO authenticated
USING (
  realtor_id IN (
    SELECT r.id FROM public.realtors r
    JOIN public.teams t ON r.team_id = t.id
    JOIN public.offices o ON t.office_id = o.id
    JOIN public.cities c ON o.city_id = c.id
    WHERE c.manager_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Allow regional managers to update training progress in their cities
CREATE POLICY IF NOT EXISTS "Regional managers can update training progress in their cities"
ON public.training_progress FOR UPDATE
TO authenticated
USING (
  realtor_id IN (
    SELECT r.id FROM public.realtors r
    JOIN public.teams t ON r.team_id = t.id
    JOIN public.offices o ON t.office_id = o.id
    JOIN public.cities c ON o.city_id = c.id
    WHERE c.manager_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Comments
COMMENT ON COLUMN public.cities.manager_id IS 'ID of the regional manager (profile)';
COMMENT ON TYPE app_role IS 'User roles: admin, realtor, team_leader, office_manager, regional_manager';

