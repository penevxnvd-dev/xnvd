-- SQL скрипт за създаване на админски акаунт
-- Изпълнете този скрипт в Supabase SQL Editor СЛЕД като създадете потребителя в Authentication

-- Първо създайте потребителя в Supabase Dashboard:
-- Authentication > Users > Add user > Create new user
-- Email: admin@xnvd.com
-- Password: Admin123!
-- Auto Confirm User: ✅

-- След това изпълнете този SQL:

-- Обновяване на профила (ако е необходимо)
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

-- Добавяне на админска роля
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id,
    'admin'::app_role
FROM auth.users
WHERE email = 'admin@xnvd.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Проверка (опционално - за да видите резултата)
SELECT 
    u.email,
    p.full_name,
    ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@xnvd.com';

