# Админски акаунт

## Данни за вход

**Email:** `admin@xnvd.com`  
**Парола:** `Admin123!`  
**Име:** `Администратор`  
**Роля:** `admin`

---

## Как да създадете акаунта

### Вариант 1: Чрез скрипт (препоръчително)

1. Задайте Supabase credentials като environment variables:
```bash
export VITE_SUPABASE_URL="your-supabase-project-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

2. Стартирайте скрипта:
```bash
node create-admin.js
```

### Вариант 2: Ръчно чрез Supabase Dashboard

1. Отидете в Supabase Dashboard > Authentication > Users
2. Създайте нов потребител с:
   - Email: `admin@xnvd.com`
   - Password: `Admin123!`
   - Email confirmed: ✅

3. В SQL Editor изпълнете:
```sql
-- Намерете user_id от auth.users таблицата
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@xnvd.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Вариант 3: Чрез приложението (ако имате друг админ)

1. Влезте като съществуващ админ
2. Отидете в Admin Dashboard
3. Създайте нов потребител (ако имате такава функционалност)
4. Добавете ролята 'admin' в базата данни

---

## Важни бележки

- ⚠️ **SERVICE_ROLE_KEY** е секретен ключ - не го споделяйте!
- ⚠️ Сменете паролата след първо влизане
- ⚠️ Уверете се, че email confirmation е активиран

---

## Проверка

След създаване на акаунта, влезте в приложението на:
**http://localhost:5174/auth**

С данните:
- Email: `admin@xnvd.com`
- Password: `Admin123!`

