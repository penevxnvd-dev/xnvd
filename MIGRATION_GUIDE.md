# 🚀 Автоматично прилагане на миграции

## Бърз старт

### Стъпка 1: Добавете DATABASE_URL в .env

1. Отворете: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/settings/database
2. Скролнете до "Connection string"
3. Изберете "Connection pooling" > "Session mode"
4. Копирайте connection string-а
5. Добавете го в `.env` файла:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Или** използвайте директния connection string:

```env
DATABASE_URL=postgresql://postgres:[password]@db.rbpqagivdpacdvwlwgep.supabase.co:5432/postgres
```

### Стъпка 2: Изпълнете миграцията

```bash
node run-migration.js
```

Това автоматично ще приложи всички миграции от `apply-supabase-migrations.sql`!

## Какво прави скриптът

1. ✅ Чете `DATABASE_URL` от `.env`
2. ✅ Чете SQL миграцията от `apply-supabase-migrations.sql`
3. ✅ Използва `psql` за директна връзка с базата данни
4. ✅ Прилага всички промени автоматично
5. ✅ Показва резултата и предупреждения

## Изисквания

- ✅ `psql` (PostgreSQL client) - обикновено е инсталиран
- ✅ `DATABASE_URL` в `.env` файла
- ✅ Интернет връзка

## Проверка

След изпълнение, проверете в Supabase Dashboard:

1. **Роли**: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/auth/roles
   - Трябва да видите: `team_leader`, `office_manager`, `regional_manager`

2. **Таблици**: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/editor
   - `cities` таблицата трябва да има колона `manager_id`
   - `offices` таблицата трябва да има колона `manager_id`

3. **RLS Policies**: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/auth/policies
   - Трябва да има нови policies за новите роли

## Следващи стъпки

След успешно прилагане на миграцията:

1. Създайте мениджърски акаунти:
   ```bash
   node create-managers-accounts.js
   ```

2. Или използвайте SQL скрипта:
   ```bash
   # Копирайте съдържанието от create-managers-accounts.sql
   # и го изпълнете в Supabase SQL Editor
   ```

## Проблеми?

### Грешка: "password authentication failed"
- Проверете паролата в `DATABASE_URL`
- Уверете се, че използвате правилния connection string

### Грешка: "could not connect"
- Проверете интернет връзката
- Проверете дали `DATABASE_URL` е правилен
- Уверете се, че използвате "Session mode" connection string

### Грешка: "psql: command not found"
- Инсталирайте PostgreSQL client:
  ```bash
  sudo apt-get install postgresql-client
  ```

## Алтернативни методи

Ако `run-migration.js` не работи, можете да използвате:

1. **Supabase SQL Editor** (ръчно):
   ```bash
   node apply-migration.js
   ```
   Това ще отвори SQL Editor и ще покаже SQL кода за копиране.

2. **Supabase CLI** (ако е инсталиран):
   ```bash
   supabase login
   supabase link --project-ref rbpqagivdpacdvwlwgep
   supabase db push
   ```

