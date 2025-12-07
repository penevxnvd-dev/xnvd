# Създаване на админски акаунт

## Вариант 1: Чрез Supabase Dashboard (Препоръчително)

### Стъпка 1: Създайте auth потребителя

1. Отидете в Supabase Dashboard:
   - https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users

2. Кликнете на "Add user" → "Create new user"

3. Попълнете:
   - **Email:** `admin@xnvd.com`
   - **Password:** `Admin123!`
   - **Auto Confirm User:** ✅ (важно!)

4. Кликнете "Create user"

### Стъпка 2: Създайте профил и роля

1. Отидете в SQL Editor:
   - https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new

2. Изпълнете следния SQL:

```sql
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

-- Verify
SELECT 
    u.email,
    p.full_name,
    ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@xnvd.com';
```

## Вариант 2: Чрез скрипт (изисква Service Role Key)

1. Добавете Service Role Key в `.env`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. Стартирайте скрипта:
```bash
node scripts/create-admin-account.js
```

## Данни за вход

- **Email:** `admin@xnvd.com`
- **Password:** `Admin123!`
- **Име:** `Администратор`
- **Роля:** `admin`

## Важни бележки

- ⚠️ **SERVICE_ROLE_KEY** е секретен ключ - не го споделяйте!
- ⚠️ Сменете паролата след първо влизане
- ⚠️ Уверете се, че email confirmation е активиран

## Проверка

След създаване на акаунта, влезте в приложението на:
**http://localhost:5174/auth**

С данните:
- Email: `admin@xnvd.com`
- Password: `Admin123!`

