-- SQL Script to create manager accounts
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new
-- 
-- IMPORTANT: First apply the migration: supabase/migrations/20251206000001_add_regional_manager.sql
-- Then execute this script

-- Function to create user account and profile
CREATE OR REPLACE FUNCTION create_manager_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- Create user in auth.users (this requires admin privileges)
  -- Note: You may need to create users manually in Supabase Dashboard > Authentication > Users
  -- Then use their IDs here
  
  -- For now, we'll assume users are created manually and we just need to find them
  -- or create profiles if they don't exist
  
  -- Find existing user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  -- If user doesn't exist, you need to create it manually in Supabase Dashboard
  -- Authentication > Users > Add User
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Please create it first in Supabase Dashboard > Authentication > Users', p_email;
  END IF;
  
  -- Create or update profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (v_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE
  SET full_name = p_full_name, email = p_email;
  
  v_profile_id := v_user_id;
  
  -- Add role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_profile_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create accounts (you need to create users in Supabase Dashboard first)
-- Step 1: Go to Supabase Dashboard > Authentication > Users
-- Step 2: Create users with these emails and passwords:
--   - krasi.katev@xnvd.com / Krasi123!
--   - lazar.bundev@xnvd.com / Lazar123!
--   - georgi.penev@xnvd.com / Georgi123!
--   - kamen.georgiev@xnvd.com / Kamen123!

-- After creating users, run the following:

-- 1. Краси Кътев - Office Manager
DO $$
DECLARE
  v_user_id UUID;
  v_city_id UUID;
  v_office_id UUID;
BEGIN
  -- Find user
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'krasi.katev@xnvd.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Create profile and role
    PERFORM create_manager_account('krasi.katev@xnvd.com', 'Krasi123!', 'Краси Кътев', 'office_manager');
    
    -- Find or create Бургас city
    SELECT id INTO v_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
    IF v_city_id IS NULL THEN
      INSERT INTO cities (name, country_id)
      SELECT 'Бургас', id FROM countries WHERE name = 'България' LIMIT 1
      RETURNING id INTO v_city_id;
    END IF;
    
    -- Find or create office
    SELECT id INTO v_office_id FROM offices WHERE city_id = v_city_id LIMIT 1;
    IF v_office_id IS NULL THEN
      INSERT INTO offices (name, city_id)
      VALUES ('Офис Бургас', v_city_id)
      RETURNING id INTO v_office_id;
    END IF;
    
    -- Set manager
    UPDATE offices SET manager_id = v_user_id WHERE id = v_office_id;
    
    RAISE NOTICE '✓ Краси Кътев създаден като Office Manager';
  ELSE
    RAISE NOTICE '⚠️  Потребител krasi.katev@xnvd.com не съществува. Създайте го първо в Authentication > Users';
  END IF;
END $$;

-- 2. Лазар Бундев - Team Leader
DO $$
DECLARE
  v_user_id UUID;
  v_city_id UUID;
  v_office_id UUID;
  v_team_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'lazar.bundev@xnvd.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM create_manager_account('lazar.bundev@xnvd.com', 'Lazar123!', 'Лазар Бундев', 'team_leader');
    
    SELECT id INTO v_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
    IF v_city_id IS NULL THEN
      INSERT INTO cities (name, country_id)
      SELECT 'Бургас', id FROM countries WHERE name = 'България' LIMIT 1
      RETURNING id INTO v_city_id;
    END IF;
    
    SELECT id INTO v_office_id FROM offices WHERE city_id = v_city_id LIMIT 1;
    IF v_office_id IS NULL THEN
      INSERT INTO offices (name, city_id)
      VALUES ('Офис Бургас', v_city_id)
      RETURNING id INTO v_office_id;
    END IF;
    
    -- Find or create team
    SELECT id INTO v_team_id FROM teams WHERE name = 'Лазар Бундев' AND office_id = v_office_id LIMIT 1;
    IF v_team_id IS NULL THEN
      INSERT INTO teams (name, office_id, leader_id)
      VALUES ('Лазар Бундев', v_office_id, v_user_id)
      RETURNING id INTO v_team_id;
    ELSE
      UPDATE teams SET leader_id = v_user_id WHERE id = v_team_id;
    END IF;
    
    RAISE NOTICE '✓ Лазар Бундев създаден като Team Leader';
  ELSE
    RAISE NOTICE '⚠️  Потребител lazar.bundev@xnvd.com не съществува. Създайте го първо в Authentication > Users';
  END IF;
END $$;

-- 3. Георги Пенев - Team Leader
DO $$
DECLARE
  v_user_id UUID;
  v_city_id UUID;
  v_office_id UUID;
  v_team_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'georgi.penev@xnvd.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM create_manager_account('georgi.penev@xnvd.com', 'Georgi123!', 'Георги Пенев', 'team_leader');
    
    SELECT id INTO v_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
    IF v_city_id IS NULL THEN
      INSERT INTO cities (name, country_id)
      SELECT 'Бургас', id FROM countries WHERE name = 'България' LIMIT 1
      RETURNING id INTO v_city_id;
    END IF;
    
    SELECT id INTO v_office_id FROM offices WHERE city_id = v_city_id LIMIT 1;
    IF v_office_id IS NULL THEN
      INSERT INTO offices (name, city_id)
      VALUES ('Офис Бургас', v_city_id)
      RETURNING id INTO v_office_id;
    END IF;
    
    -- Find or create team
    SELECT id INTO v_team_id FROM teams WHERE name = 'Георги Пенев' AND office_id = v_office_id LIMIT 1;
    IF v_team_id IS NULL THEN
      INSERT INTO teams (name, office_id, leader_id)
      VALUES ('Георги Пенев', v_office_id, v_user_id)
      RETURNING id INTO v_team_id;
    ELSE
      UPDATE teams SET leader_id = v_user_id WHERE id = v_team_id;
    END IF;
    
    RAISE NOTICE '✓ Георги Пенев създаден като Team Leader';
  ELSE
    RAISE NOTICE '⚠️  Потребител georgi.penev@xnvd.com не съществува. Създайте го първо в Authentication > Users';
  END IF;
END $$;

-- 4. Камен Георгиев - Regional Manager
DO $$
DECLARE
  v_user_id UUID;
  v_city_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'kamen.georgiev@xnvd.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM create_manager_account('kamen.georgiev@xnvd.com', 'Kamen123!', 'Камен Георгиев', 'regional_manager');
    
    -- Set manager for Бургас
    SELECT id INTO v_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
    IF v_city_id IS NULL THEN
      INSERT INTO cities (name, country_id, manager_id)
      SELECT 'Бургас', id, v_user_id FROM countries WHERE name = 'България' LIMIT 1
      RETURNING id INTO v_city_id;
    ELSE
      UPDATE cities SET manager_id = v_user_id WHERE id = v_city_id;
    END IF;
    
    -- Set manager for Пловдив
    SELECT id INTO v_city_id FROM cities WHERE name = 'Пловдив' LIMIT 1;
    IF v_city_id IS NULL THEN
      INSERT INTO cities (name, country_id, manager_id)
      SELECT 'Пловдив', id, v_user_id FROM countries WHERE name = 'България' LIMIT 1
      RETURNING id INTO v_city_id;
    ELSE
      UPDATE cities SET manager_id = v_user_id WHERE id = v_city_id;
    END IF;
    
    RAISE NOTICE '✓ Камен Георгиев създаден като Regional Manager';
  ELSE
    RAISE NOTICE '⚠️  Потребител kamen.georgiev@xnvd.com не съществува. Създайте го първо в Authentication > Users';
  END IF;
END $$;

-- Cleanup function
DROP FUNCTION IF EXISTS create_manager_account(TEXT, TEXT, TEXT, TEXT);

RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '✅ Скриптът е изпълнен!';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '';
RAISE NOTICE '📋 СЪЗДАДЕНИ АКАУНТИ:';
RAISE NOTICE '1. Краси Кътев - Office Manager (Бургас)';
RAISE NOTICE '2. Лазар Бундев - Team Leader (Бургас)';
RAISE NOTICE '3. Георги Пенев - Team Leader (Бургас)';
RAISE NOTICE '4. Камен Георгиев - Regional Manager (Бургас, Пловдив)';
RAISE NOTICE '';
RAISE NOTICE '🌐 Влезте на: https://xnvd.vercel.app/auth';

