# Миграция към нова Supabase организация

## Нова организация

**Organization ID:** `rbpqagivdpacdvwlwgep`  
**Dashboard:** https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep

## Стъпки за миграция

### 1. Отворете новата организация

Отидете на: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep

### 2. Изберете или създайте проект

- Ако има съществуващ проект, изберете го
- Ако няма, създайте нов проект

### 3. Обновете .env файла

Вземете новите credentials от новия проект:

1. **VITE_SUPABASE_URL**
   - Settings > API > Project URL

2. **VITE_SUPABASE_PUBLISHABLE_KEY**
   - Settings > API > Project API keys > `anon` `public`

3. **DATABASE_URL** (за миграции)
   - Settings > Database > Connection string > Connection pooling > Session mode

4. **SUPABASE_ACCESS_TOKEN** (опционално)
   - Account Settings > Access Tokens

Обновете `.env` файла:

```env
VITE_SUPABASE_URL=https://[new-project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[new-anon-key]
DATABASE_URL=postgresql://postgres:[password]@db.[new-project-ref].supabase.co:5432/postgres
SUPABASE_ACCESS_TOKEN=[new-access-token]
```

### 4. Приложете миграциите

След като обновите `.env`, приложете миграциите:

```bash
node run-migration.js
```

### 5. Създайте акаунти

След прилагане на миграциите, създайте мениджърските акаунти:

```bash
node create-managers-accounts.js
```

Или използвайте SQL скрипта в новия проект.

## Важно

- Старият проект (`ufpeftuanzmkiryohesd`) вече не се използва
- Всички данни трябва да бъдат мигрирани към новия проект
- Уверете се, че всички environment variables са обновени

## Проверка

След миграцията, проверете:

1. ✅ Всички роли са създадени
2. ✅ Таблиците имат правилните колони
3. ✅ RLS policies са приложени
4. ✅ Може да влезете с акаунти

