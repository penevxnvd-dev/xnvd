-- SQL script to create manager accounts
-- NOTE: This creates profiles and user_roles, but auth users must be created via Supabase Auth API first
-- After creating auth users, run this script to set up profiles and roles

-- Step 1: Create auth users via Supabase Dashboard or API
-- Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users
-- Create users with these emails:
--   - krasi.katev@xnvd.com (password: Krasi123!)
--   - lazar.bundev@xnvd.com (password: Lazar123!)
--   - georgi.penev@xnvd.com (password: Georgi123!)
--   - kamen.georgiev@xnvd.com (password: Kamen123!)

-- Step 2: After auth users are created, run this SQL to set up profiles and roles

-- Краси Кътев - Office Manager, Бургас
DO $$
DECLARE
  krasi_user_id UUID;
  burgas_city_id UUID;
  burgas_office_id UUID;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO krasi_user_id FROM auth.users WHERE email = 'krasi.katev@xnvd.com' LIMIT 1;
  
  IF krasi_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Auth user krasi.katev@xnvd.com not found. Please create it first in Supabase Dashboard > Authentication > Users';
    RETURN;
  END IF;

  -- Create or update profile
  INSERT INTO profiles (id, full_name, email)
  VALUES (krasi_user_id, 'Краси Кътев', 'krasi.katev@xnvd.com')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Краси Кътев', email = 'krasi.katev@xnvd.com';

  -- Create role
  INSERT INTO user_roles (user_id, role)
  VALUES (krasi_user_id, 'office_manager'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Get Burgas city and office
  SELECT id INTO burgas_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
  SELECT id INTO burgas_office_id FROM offices WHERE name = 'Офис Бургас' AND city_id = burgas_city_id LIMIT 1;

  -- Set as office manager
  IF burgas_office_id IS NOT NULL THEN
    UPDATE offices SET manager_id = krasi_user_id WHERE id = burgas_office_id;
    RAISE NOTICE '✅ Краси Кътев - Office Manager на Офис Бургас';
  END IF;
END $$;

-- Лазар Бундев - Team Leader, Бургас
DO $$
DECLARE
  lazar_user_id UUID;
  burgas_city_id UUID;
  burgas_office_id UUID;
  lazar_team_id UUID;
BEGIN
  SELECT id INTO lazar_user_id FROM auth.users WHERE email = 'lazar.bundev@xnvd.com' LIMIT 1;
  
  IF lazar_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Auth user lazar.bundev@xnvd.com not found. Please create it first.';
    RETURN;
  END IF;

  INSERT INTO profiles (id, full_name, email)
  VALUES (lazar_user_id, 'Лазар Бундев', 'lazar.bundev@xnvd.com')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Лазар Бундев', email = 'lazar.bundev@xnvd.com';

  INSERT INTO user_roles (user_id, role)
  VALUES (lazar_user_id, 'team_leader'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO burgas_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
  SELECT id INTO burgas_office_id FROM offices WHERE name = 'Офис Бургас' AND city_id = burgas_city_id LIMIT 1;

  -- Create or get team
  SELECT id INTO lazar_team_id FROM teams WHERE name = 'Лазар Бундев' AND office_id = burgas_office_id LIMIT 1;
  IF lazar_team_id IS NULL THEN
    INSERT INTO teams (name, office_id, leader_id) 
    VALUES ('Лазар Бундев', burgas_office_id, lazar_user_id)
    RETURNING id INTO lazar_team_id;
  ELSE
    UPDATE teams SET leader_id = lazar_user_id WHERE id = lazar_team_id;
  END IF;

  RAISE NOTICE '✅ Лазар Бундев - Team Leader на екип Лазар Бундев';
END $$;

-- Георги Пенев - Team Leader, Бургас
DO $$
DECLARE
  georgi_user_id UUID;
  burgas_city_id UUID;
  burgas_office_id UUID;
  georgi_team_id UUID;
BEGIN
  SELECT id INTO georgi_user_id FROM auth.users WHERE email = 'georgi.penev@xnvd.com' LIMIT 1;
  
  IF georgi_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Auth user georgi.penev@xnvd.com not found. Please create it first.';
    RETURN;
  END IF;

  INSERT INTO profiles (id, full_name, email)
  VALUES (georgi_user_id, 'Георги Пенев', 'georgi.penev@xnvd.com')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Георги Пенев', email = 'georgi.penev@xnvd.com';

  INSERT INTO user_roles (user_id, role)
  VALUES (georgi_user_id, 'team_leader'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO burgas_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
  SELECT id INTO burgas_office_id FROM offices WHERE name = 'Офис Бургас' AND city_id = burgas_city_id LIMIT 1;

  SELECT id INTO georgi_team_id FROM teams WHERE name = 'Георги Пенев' AND office_id = burgas_office_id LIMIT 1;
  IF georgi_team_id IS NULL THEN
    INSERT INTO teams (name, office_id, leader_id) 
    VALUES ('Георги Пенев', burgas_office_id, georgi_user_id)
    RETURNING id INTO georgi_team_id;
  ELSE
    UPDATE teams SET leader_id = georgi_user_id WHERE id = georgi_team_id;
  END IF;

  RAISE NOTICE '✅ Георги Пенев - Team Leader на екип Георги Пенев';
END $$;

-- Камен Георгиев - Regional Manager, Бургас и Пловдив
DO $$
DECLARE
  kamen_user_id UUID;
  burgas_city_id UUID;
  plovdiv_city_id UUID;
BEGIN
  SELECT id INTO kamen_user_id FROM auth.users WHERE email = 'kamen.georgiev@xnvd.com' LIMIT 1;
  
  IF kamen_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Auth user kamen.georgiev@xnvd.com not found. Please create it first.';
    RETURN;
  END IF;

  INSERT INTO profiles (id, full_name, email)
  VALUES (kamen_user_id, 'Камен Георгиев', 'kamen.georgiev@xnvd.com')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Камен Георгиев', email = 'kamen.georgiev@xnvd.com';

  INSERT INTO user_roles (user_id, role)
  VALUES (kamen_user_id, 'regional_manager'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO burgas_city_id FROM cities WHERE name = 'Бургас' LIMIT 1;
  SELECT id INTO plovdiv_city_id FROM cities WHERE name = 'Пловдив' LIMIT 1;

  -- Set as regional manager for both cities
  IF burgas_city_id IS NOT NULL THEN
    UPDATE cities SET manager_id = kamen_user_id WHERE id = burgas_city_id;
  END IF;

  IF plovdiv_city_id IS NOT NULL THEN
    UPDATE cities SET manager_id = kamen_user_id WHERE id = plovdiv_city_id;
  END IF;

  RAISE NOTICE '✅ Камен Георгиев - Regional Manager на Бургас и Пловдив';
END $$;

SELECT 'Account setup complete!' as status;

