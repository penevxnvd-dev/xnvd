-- Fix RLS policies for local PostgreSQL (without Supabase auth)
-- This version works with local PostgreSQL database

-- Create a simple auth.uid() function for local PostgreSQL
-- This returns the current user's ID from the session
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- For local PostgreSQL, we'll use a session variable or return NULL
  -- In practice, you'd set this from your application
  RETURN current_setting('app.current_user_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Now apply the RLS policy fixes
-- Fix countries policy
DROP POLICY IF EXISTS "Admins can manage countries" ON public.countries;
CREATE POLICY "Admins can manage countries" ON public.countries 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix cities policy
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
CREATE POLICY "Admins can manage cities" ON public.cities 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix offices policy
DROP POLICY IF EXISTS "Admins can manage offices" ON public.offices;
CREATE POLICY "Admins can manage offices" ON public.offices 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix teams policy
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams" ON public.teams 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix realtors policy
DROP POLICY IF EXISTS "Admins can manage realtors" ON public.realtors;
CREATE POLICY "Admins can manage realtors" ON public.realtors 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix deals policy
DROP POLICY IF EXISTS "Admins can manage deals" ON public.deals;
CREATE POLICY "Admins can manage deals" ON public.deals 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix diagnoses policy
DROP POLICY IF EXISTS "Admins can manage diagnoses" ON public.diagnoses;
CREATE POLICY "Admins can manage diagnoses" ON public.diagnoses 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix training_progress policy
DROP POLICY IF EXISTS "Admins can manage training progress" ON public.training_progress;
CREATE POLICY "Admins can manage training progress" ON public.training_progress 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix user_roles policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

