# Как да получите Service Role Key

## Проблем

Скриптът `create-managers-accounts.js` изисква **Service Role Key** за създаване на потребители чрез Supabase Admin API. Anon key не може да създава потребители.

## Решение

### Стъпка 1: Вземете Service Role Key

1. Отворете Supabase Dashboard:
   https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api

2. Скролнете до секцията **"Project API keys"**

3. Намерете **"service_role"** key (секретен ключ)

4. Копирайте го

### Стъпка 2: Добавете в .env

Добавете следния ред в `.env` файла:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Или:**

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Стъпка 3: Изпълнете скрипта

```bash
node create-managers-accounts.js
```

## Важно

⚠️ **Service Role Key е много чувствителен!**
- Не го споделяйте публично
- Не го commit-вайте в Git
- Използвайте го само на сървъра или за административни скриптове
- Той обхожда всички RLS policies

## Алтернатива: Създаване на акаунти ръчно

Ако не искате да използвате Service Role Key, можете да създадете акаунтите ръчно:

1. Отидете в Supabase Dashboard > Authentication > Users
2. Създайте потребителите ръчно
3. След това изпълнете SQL заявка за създаване на profiles и user_roles

## SQL за ръчно създаване (след като auth users са създадени)

```sql
-- След като създадете auth users, изпълнете това:

-- Краси Кътев (Office Manager, Бургас)
INSERT INTO profiles (id, full_name, email)
SELECT id, 'Краси Кътев', 'krasi.katev@xnvd.com'
FROM auth.users WHERE email = 'krasi.katev@xnvd.com'
ON CONFLICT (id) DO UPDATE SET full_name = 'Краси Кътев';

INSERT INTO user_roles (user_id, role)
SELECT id, 'office_manager'::app_role
FROM auth.users WHERE email = 'krasi.katev@xnvd.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Назначете като мениджър на офис
UPDATE offices
SET manager_id = (SELECT id FROM auth.users WHERE email = 'krasi.katev@xnvd.com')
WHERE name = 'Офис Бургас' AND city_id = (SELECT id FROM cities WHERE name = 'Бургас');

-- Повторете за останалите акаунти...
```

