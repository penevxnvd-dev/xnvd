# Migration Guide

Каноничен документ за прилагане на SQL миграции и RLS fix-ове.

## 1) Database URL

Добавете в `.env`:

```env
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

Или pooling connection string (Session mode), според проекта.

## 2) Apply Migrations

Основен начин:

```bash
node run-migration.js
```

Алтернативно:
- Supabase SQL Editor (копиране на SQL)
- `psql` директно
- Supabase CLI (`supabase db push`)

## 3) RLS Fix (ако е нужен)

Използвайте migration file за RLS policies (`supabase/migrations/*fix_rls*`), когато admin няма INSERT/UPDATE/DELETE права.

## 4) Verify

Проверете:
- таблиците/колоните са създадени
- `app_role` enum съдържа нужните роли
- RLS policies са активни и коректни

Примерни проверки:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

```sql
select enumlabel
from pg_enum
where enumtypid = (select oid from pg_type where typname = 'app_role')
order by enumsortorder;
```

## 5) Common Errors

- `password authentication failed` -> грешна парола/connection string
- `psql: command not found` -> липсва PostgreSQL client
- `row violates row-level security policy` -> RLS fix migration не е приложена

