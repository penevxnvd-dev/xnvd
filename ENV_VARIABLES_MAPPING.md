# Environment Variables Mapping

## 📋 Сканиране на проекта за Environment Variables

Този документ описва всички environment variables, използвани в проекта, и как те се мапват от `.env` файла.

## ✅ Налични в .env

След сканиране на проекта, наличните променливи в `.env` са:

- ✅ `VITE_SUPABASE_URL` - Supabase project URL
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/publishable key
- ⚪ `VITE_SUPABASE_PROJECT_ID` - Project ID (не се използва в кода)
- ⚪ `VITE_API_URL` - API URL (не се използва в кода, остатък от стария Express backend)

## 🔄 Мапване на имена

Проектът поддържа множество варианти на имена за по-голяма гъвкавост:

### Supabase URL
- `VITE_SUPABASE_URL` (приоритет)
- `SUPABASE_URL` (алтернатива)

### Supabase Keys
- `VITE_SUPABASE_PUBLISHABLE_KEY` (основен, използван във frontend)
- `VITE_SUPABASE_SERVICE_ROLE_KEY` (опционален, за admin операции)
- `SUPABASE_SERVICE_ROLE_KEY` (алтернатива)
- `VITE_SUPABASE_ANON_KEY` (алтернатива за publishable key)
- `SUPABASE_ANON_KEY` (алтернатива)

### Database
- `DATABASE_URL` (за Prisma, опционален)

### Analytics (опционални)
- `VITE_SENTRY_DSN` - Sentry error tracking
- `VITE_GA_ID` - Google Analytics
- `VITE_PLAUSIBLE_DOMAIN` - Plausible Analytics

## 📁 Файлове, които използват Environment Variables

### Frontend (`src/`)
- `src/lib/env.ts` - Валидация на environment variables
- `src/integrations/supabase/client.ts` - Supabase client инициализация
- `src/lib/analytics.ts` - Analytics конфигурация

### Backend (`server/`)
- `server/src/lib/supabase.ts` - Supabase admin client
- `server/prisma/schema.prisma` - DATABASE_URL за Prisma

### Scripts
- `create-managers-accounts.js` - Създаване на мениджърски акаунти
- `server/scripts/create-managers-supabase.js` - Алтернативен скрипт

## 🔍 Как да сканирате проекта

Използвайте скрипта за сканиране:

```bash
node scan-env-vars.js
```

Това ще покаже:
- Кои променливи са налични в `.env`
- Кои са задължителни и кои опционални
- Кои променливи не се използват в кода
- Мапване на алтернативни имена

## ✅ Проверка

Всички задължителни променливи са налични:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY`

Опционалните променливи могат да бъдат добавени при нужда:
- ⚪ `VITE_SUPABASE_SERVICE_ROLE_KEY` - За admin операции
- ⚪ `VITE_SENTRY_DSN` - За error tracking
- ⚪ `VITE_GA_ID` - За Google Analytics
- ⚪ `VITE_PLAUSIBLE_DOMAIN` - За Plausible Analytics

## 📝 Бележки

- `VITE_SUPABASE_PROJECT_ID` и `VITE_API_URL` са в `.env`, но не се използват в кода
- Те могат да бъдат премахнати или оставени за бъдеща употреба
- Всички `VITE_*` променливи са достъпни във frontend кода чрез `import.meta.env`
- Backend скриптовете използват `process.env`

