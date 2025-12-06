# Настройка на Supabase Database Connection

## Важно

Базата данни е в Supabase (remote), не в локалната PostgreSQL база.

## Стъпка 1: Вземете Connection String от Supabase

1. Отидете в [Supabase Dashboard](https://supabase.com/dashboard)
2. Изберете проекта: `qxompdwqdnemsntssjot`
3. Отидете в **Settings** > **Database**
4. В секцията **Connection string** намерете:
   - **URI** (за директна връзка)
   - **Connection pooling** (препоръчително за production)

## Стъпка 2: Обновете server/.env

Отворете `server/.env` и обновете `DATABASE_URL`:

```env
# Старо (локална база):
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xnvd?schema=public"

# Ново (Supabase remote):
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Или за директна връзка (без pooling):
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].supabase.co:5432/postgres"
```

### Формат на Connection String:

**Connection Pooling (препоръчително):**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Директна връзка:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].supabase.com:5432/postgres
```

### Параметри:
- `[PROJECT_REF]` - вашият project reference (от config.toml: `qxompdwqdnemsntssjot`)
- `[PASSWORD]` - вашата database password (от Supabase Dashboard)
- `[REGION]` - региона на вашия проект (например: `eu-central-1`, `us-east-1`)

## Стъпка 3: Приложете миграциите

След като обновите `DATABASE_URL`, приложете миграциите от `supabase/migrations/`:

```bash
cd server

# Генерирайте Prisma Client
npx prisma generate

# Приложете миграциите
# Миграциите вече са приложени в Supabase, но ако трябва да ги приложите отново:
psql $DATABASE_URL -f ../supabase/migrations/20251129111411_d0967e6d-88a3-4bbc-8c45-d8dfacf2b54c.sql
psql $DATABASE_URL -f ../supabase/migrations/20251129111444_f07316d8-c975-4465-9ed5-de65b1e519e4.sql
psql $DATABASE_URL -f ../supabase/migrations/20250101000000_add_kpi_functions.sql
```

## Стъпка 4: Рестартирайте сървъра

```bash
cd server
npm run dev
```

## Важни бележки

1. **Connection Pooling**: Използвайте connection pooling за по-добра производителност
2. **SSL**: Supabase изисква SSL връзка. Добавете `?sslmode=require` ако е необходимо
3. **Password**: Не споделяйте database password публично
4. **Environment Variables**: Уверете се, че `server/.env` не е в git (добавен в `.gitignore`)

## Проверка на връзката

```bash
# Тест на връзката
psql $DATABASE_URL -c "SELECT version();"
```

## Автоматична синхронизация

Prisma extension в `server/src/lib/prisma.ts` автоматично синхронизира промените с Supabase, така че данните винаги са синхронизирани.

