-- Disable RLS for local PostgreSQL database
-- Since you're using Express.js backend with JWT auth, RLS is not needed
-- This simplifies the setup for local development

-- Disable RLS on all tables (if enabled)
ALTER TABLE IF EXISTS public.countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.realtors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnoses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Admins can manage countries" ON public.countries;
DROP POLICY IF EXISTS "Everyone can view countries" ON public.countries;
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
DROP POLICY IF EXISTS "Everyone can view cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can manage offices" ON public.offices;
DROP POLICY IF EXISTS "Everyone can view offices" ON public.offices;
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Everyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can manage realtors" ON public.realtors;
DROP POLICY IF EXISTS "Admins can view all realtors" ON public.realtors;
DROP POLICY IF EXISTS "Realtors can view own data" ON public.realtors;
DROP POLICY IF EXISTS "Admins can manage deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Realtors can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Realtors can insert own deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can manage diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Admins can view all diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Realtors can view own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Realtors can insert own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Admins can manage training progress" ON public.training_progress;
DROP POLICY IF EXISTS "Admins can view all training progress" ON public.training_progress;
DROP POLICY IF EXISTS "Realtors can view own training progress" ON public.training_progress;
DROP POLICY IF EXISTS "Realtors can update own training progress" ON public.training_progress;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

