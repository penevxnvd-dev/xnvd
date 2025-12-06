# 🔗 Supabase Dashboard Links

## API Settings (за service_role key)
**Това е най-важният линк - тук ще намериш service_role key:**

👉 https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/settings/api

### Как да вземеш service_role key:
1. Отвори линка по-горе
2. В секцията **"Project API keys"** намери **`service_role`** key
3. Кликни на иконата за копиране (📋) до ключа
4. Поставя го в `server/.env` като:
   ```env
   SUPABASE_SERVICE_ROLE_KEY="тук-постави-копирания-ключ"
   ```

## Други полезни линкове:

### Database Settings
https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/settings/database

### Project Overview
https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep//supabase.com/dashboard/project/rbpqagivdpacdvwlwgep/sql/new

### Table Editor
https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/editor

## ⚠️ Важно:

- `service_role` key има **пълни права** и заобикаля всички RLS policies
- **НЕ споделяй** този ключ публично
- Използвай го **само** в backend сървъра (`server/.env`)
- Ако случайно го споделиш, **регенерирай** го от Dashboard

