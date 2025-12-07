-- ============================================================================
-- Create Accounts and Offices with Relationships
-- ============================================================================
-- This script creates:
-- - Auth users (if they don't exist)
-- - Profiles
-- - User roles
-- - Offices with addresses
-- - City managers (regional managers)
-- - Office managers
-- - Teams for team leaders
-- ============================================================================
-- IMPORTANT: This script requires Service Role permissions
-- Run in Supabase SQL Editor (bypasses RLS)
-- ============================================================================

-- Helper function to get or create user
CREATE OR REPLACE FUNCTION get_or_create_user(
  p_email TEXT,
  p_full_name TEXT,
  p_password TEXT DEFAULT 'TempPassword123!'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  -- If user doesn't exist, we can't create it via SQL (need Admin API)
  -- So we'll just return NULL and log a message
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️  User % does not exist in auth.users. Create via Supabase Auth Dashboard or Admin API', p_email;
    RETURN NULL;
  END IF;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (v_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email;
  
  RETURN v_user_id;
END;
$$;

-- Main script
DO $$
DECLARE
  v_country_id UUID;
  v_sofia_id UUID;
  v_plovdiv_id UUID;
  v_burgas_id UUID;
  v_varna_id UUID;
  
  v_kamen_id UUID;
  v_krasi_id UUID;
  v_georgi_id UUID;
  v_lazar_id UUID;
  
  v_burgas_office_id UUID;
  v_plovdiv_office_id UUID;
  v_sofia_office_id UUID;
  
  v_georgi_team_id UUID;
  v_lazar_team_id UUID;
BEGIN
  RAISE NOTICE '🚀 Creating accounts and offices...';
  RAISE NOTICE '';
  
  -- Get country ID
  SELECT id INTO v_country_id FROM public.countries WHERE name = 'България' LIMIT 1;
  IF v_country_id IS NULL THEN
    RAISE EXCEPTION 'Country България not found. Run create-initial-data.sql first.';
  END IF;
  
  -- Get city IDs
  SELECT id INTO v_sofia_id FROM public.cities WHERE name = 'София' AND country_id = v_country_id LIMIT 1;
  SELECT id INTO v_plovdiv_id FROM public.cities WHERE name = 'Пловдив' AND country_id = v_country_id LIMIT 1;
  SELECT id INTO v_burgas_id FROM public.cities WHERE name = 'Бургас' AND country_id = v_country_id LIMIT 1;
  SELECT id INTO v_varna_id FROM public.cities WHERE name = 'Варна' AND country_id = v_country_id LIMIT 1;
  
  -- Step 1: Get or create user IDs (users must be created via Auth Dashboard first)
  RAISE NOTICE '📌 Step 1: Checking users...';
  RAISE NOTICE '⚠️  Note: Users must be created via Supabase Auth Dashboard or Admin API first';
  RAISE NOTICE '';
  
  -- Try to find existing users
  SELECT id INTO v_kamen_id FROM auth.users WHERE email = 'kamen.georgiev@xnvd.com' LIMIT 1;
  SELECT id INTO v_krasi_id FROM auth.users WHERE email = 'krasi.katev@xnvd.com' LIMIT 1;
  SELECT id INTO v_georgi_id FROM auth.users WHERE email = 'georgi.penev@xnvd.com' LIMIT 1;
  SELECT id INTO v_lazar_id FROM auth.users WHERE email = 'lazar.bundev@xnvd.com' LIMIT 1;
  
  -- Step 2: Set up profiles and roles (if users exist)
  IF v_kamen_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_kamen_id, 'kamen.georgiev@xnvd.com', 'Камен Георгиев')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    -- Ensure role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_kamen_id, 'regional_manager')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Камен Георгиев: profile and role set';
  ELSE
    RAISE NOTICE '⚠️  kamen.georgiev@xnvd.com not found in auth.users';
  END IF;
  
  IF v_krasi_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_krasi_id, 'krasi.katev@xnvd.com', 'Краси Кътев')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_krasi_id, 'office_manager')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Краси Кътев: profile and role set';
  ELSE
    RAISE NOTICE '⚠️  krasi.katev@xnvd.com not found in auth.users';
  END IF;
  
  IF v_georgi_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_georgi_id, 'georgi.penev@xnvd.com', 'Георги Пенев')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_georgi_id, 'team_leader')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Георги Пенев: profile and role set';
  ELSE
    RAISE NOTICE '⚠️  georgi.penev@xnvd.com not found in auth.users';
  END IF;
  
  IF v_lazar_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_lazar_id, 'lazar.bundev@xnvd.com', 'Лазар Бундев')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_lazar_id, 'team_leader')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Лазар Бундев: profile and role set';
  ELSE
    RAISE NOTICE '⚠️  lazar.bundev@xnvd.com not found in auth.users';
  END IF;
  
  RAISE NOTICE '';
  
  -- Step 3: Set regional managers for cities
  RAISE NOTICE '📌 Step 2: Setting regional managers...';
  
  IF v_kamen_id IS NOT NULL THEN
    -- Камен Георгиев - regional manager for Пловдив and Бургас
    UPDATE public.cities
    SET manager_id = v_kamen_id
    WHERE id IN (v_plovdiv_id, v_burgas_id)
    AND (manager_id IS NULL OR manager_id != v_kamen_id);
    
    RAISE NOTICE '✅ Камен Георгиев set as regional manager for Пловдив and Бургас';
  END IF;
  
  RAISE NOTICE '';
  
  -- Step 4: Create Offices
  RAISE NOTICE '📌 Step 3: Creating offices...';
  
  -- Бургас office
  INSERT INTO public.offices (name, city_id, address, manager_id)
  VALUES ('Офис Бургас', v_burgas_id, 'ул. Хан Крум 6', v_krasi_id)
  ON CONFLICT (name, city_id) DO UPDATE
  SET address = EXCLUDED.address,
      manager_id = COALESCE(EXCLUDED.manager_id, offices.manager_id)
  RETURNING id INTO v_burgas_office_id;
  
  RAISE NOTICE '✅ Office created: Бургас (ул. Хан Крум 6)';
  
  -- Пловдив office
  INSERT INTO public.offices (name, city_id, address, manager_id)
  VALUES ('Офис Пловдив', v_plovdiv_id, 'Мария Луиза 43', NULL)
  ON CONFLICT (name, city_id) DO UPDATE
  SET address = EXCLUDED.address
  RETURNING id INTO v_plovdiv_office_id;
  
  RAISE NOTICE '✅ Office created: Пловдив (Мария Луиза 43)';
  
  -- София office
  INSERT INTO public.offices (name, city_id, address, manager_id)
  VALUES ('Офис София', v_sofia_id, 'Сребърна 14', NULL)
  ON CONFLICT (name, city_id) DO UPDATE
  SET address = EXCLUDED.address
  RETURNING id INTO v_sofia_office_id;
  
  RAISE NOTICE '✅ Office created: София (Сребърна 14)';
  
  RAISE NOTICE '';
  
  -- Step 5: Create Teams
  RAISE NOTICE '📌 Step 4: Creating teams...';
  
  IF v_georgi_id IS NOT NULL AND v_burgas_office_id IS NOT NULL THEN
    INSERT INTO public.teams (name, office_id, leader_id)
    VALUES ('Екип Георги Пенев', v_burgas_office_id, v_georgi_id)
    ON CONFLICT (name, office_id) DO UPDATE
    SET leader_id = COALESCE(EXCLUDED.leader_id, teams.leader_id)
    RETURNING id INTO v_georgi_team_id;
    
    RAISE NOTICE '✅ Team created: Екип Георги Пенев';
  END IF;
  
  IF v_lazar_id IS NOT NULL AND v_burgas_office_id IS NOT NULL THEN
    INSERT INTO public.teams (name, office_id, leader_id)
    VALUES ('Екип Лазар Бундев', v_burgas_office_id, v_lazar_id)
    ON CONFLICT (name, office_id) DO UPDATE
    SET leader_id = COALESCE(EXCLUDED.leader_id, teams.leader_id)
    RETURNING id INTO v_lazar_team_id;
    
    RAISE NOTICE '✅ Team created: Екип Лазар Бундев';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Setup Complete!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created Structure:';
  RAISE NOTICE '   Country: България';
  RAISE NOTICE '   Cities: Варна, София, Пловдив, Бургас';
  RAISE NOTICE '   Offices:';
  RAISE NOTICE '     - Бургас: ул. Хан Крум 6 (Manager: Краси Кътев)';
  RAISE NOTICE '     - Пловдив: Мария Луиза 43';
  RAISE NOTICE '     - София: Сребърна 14';
  RAISE NOTICE '   Regional Managers:';
  RAISE NOTICE '     - Камен Георгиев: Пловдив, Бургас';
  RAISE NOTICE '   Office Managers:';
  RAISE NOTICE '     - Краси Кътев: Бургас office';
  RAISE NOTICE '   Team Leaders:';
  RAISE NOTICE '     - Георги Пенев: Екип Георги Пенев';
  RAISE NOTICE '     - Лазар Бундев: Екип Лазар Бундев';
  RAISE NOTICE '';
  
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_or_create_user(TEXT, TEXT, TEXT);

