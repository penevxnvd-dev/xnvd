-- Fix RLS policies to include WITH CHECK clause for INSERT operations
-- The issue: Policies with FOR ALL need both USING and WITH CHECK clauses
-- USING is for SELECT/UPDATE/DELETE, WITH CHECK is for INSERT/UPDATE

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

