-- SQL script to setup manager accounts AFTER auth users are created
-- 
-- STEP 1: Create auth users in Supabase Dashboard:
--   https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users
--   
--   Click "Add user" and create:
--   1. krasi.katev@xnvd.com / Krasi123! (Краси Кътев)
--   2. lazar.bundev@xnvd.com / Lazar123! (Лазар Бундев)
--   3. georgi.penev@xnvd.com / Georgi123! (Георги Пенев)
--   4. kamen.georgiev@xnvd.com / Kamen123! (Камен Георгиев)
--
-- STEP 2: Run this SQL script to setup profiles, roles, and relationships

-- Краси Кътев - Office Manager, Бургас
SELECT setup_manager_account(
  'krasi.katev@xnvd.com',
  'Краси Кътев',
  'office_manager'::app_role,
  'Бургас'
) as result;

-- Лазар Бундев - Team Leader, Бургас
SELECT setup_manager_account(
  'lazar.bundev@xnvd.com',
  'Лазар Бундев',
  'team_leader'::app_role,
  'Бургас',
  'Лазар Бундев'
) as result;

-- Георги Пенев - Team Leader, Бургас
SELECT setup_manager_account(
  'georgi.penev@xnvd.com',
  'Георги Пенев',
  'team_leader'::app_role,
  'Бургас',
  'Георги Пенев'
) as result;

-- Камен Георгиев - Regional Manager, Бургас и Пловдив
SELECT setup_manager_account(
  'kamen.georgiev@xnvd.com',
  'Камен Георгиев',
  'regional_manager'::app_role,
  NULL,
  NULL,
  ARRAY['Бургас', 'Пловдив']
) as result;

-- Verify setup
SELECT 
  p.full_name,
  p.email,
  ur.role,
  CASE 
    WHEN ur.role = 'office_manager' THEN (SELECT name FROM offices WHERE manager_id = p.id LIMIT 1)
    WHEN ur.role = 'team_leader' THEN (SELECT name FROM teams WHERE leader_id = p.id LIMIT 1)
    WHEN ur.role = 'regional_manager' THEN (SELECT string_agg(name, ', ') FROM cities WHERE manager_id = p.id)
    ELSE NULL
  END as assignment
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email IN (
  'krasi.katev@xnvd.com',
  'lazar.bundev@xnvd.com',
  'georgi.penev@xnvd.com',
  'kamen.georgiev@xnvd.com'
)
ORDER BY ur.role, p.full_name;

