-- Create admin account
-- IMPORTANT: First create the auth user via Supabase Dashboard:
-- 1. Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users
-- 2. Click "Add user" → "Create new user"
-- 3. Email: admin@xnvd.com
-- 4. Password: Admin123!
-- 5. Auto Confirm User: ✅
-- 6. Then run this SQL script

-- Create profile for admin
INSERT INTO public.profiles (id, full_name, email)
SELECT 
    id,
    'Администратор',
    'admin@xnvd.com'
FROM auth.users
WHERE email = 'admin@xnvd.com'
ON CONFLICT (id) 
DO UPDATE SET 
    full_name = 'Администратор',
    email = 'admin@xnvd.com';

-- Add admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id,
    'admin'::app_role
FROM auth.users
WHERE email = 'admin@xnvd.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify admin account was created
SELECT 
    u.email,
    p.full_name,
    ur.role,
    u.email_confirmed_at IS NOT NULL AS email_confirmed
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@xnvd.com';

