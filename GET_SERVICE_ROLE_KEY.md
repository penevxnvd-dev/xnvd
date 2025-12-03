# Как да вземете SUPABASE_SERVICE_ROLE_KEY

## Важно

За backend сървъра трябва **`SUPABASE_SERVICE_ROLE_KEY`**, не `anon` key.

`anon` key има ограничени права и не може да заобиколи RLS (Row Level Security) policies.

## Стъпки:

1. Отидете в [Supabase Dashboard](https://supabase.com/dashboard)
2. Изберете проекта: `ufpeftuanzmkiryohesd`
3. Отидете в **Settings** > **API**
4. В секцията **Project API keys** намерете:
   - **`service_role`** key (секретен ключ - показва се само веднъж!)
   - Този ключ започва с `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Има `"role":"service_role"` в JWT payload

5. Копирайте `service_role` key

6. Обновете `server/.env`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY="вашият-service-role-key-тук"
   ```

7. Рестартирайте сървъра:
   ```bash
   ./restart-app.sh
   ```

## ⚠️ ВАЖНО:

- `service_role` key има **пълни права** и заобикаля всички RLS policies
- **НЕ споделяйте** този ключ публично
- Ако сте го споделили, **регенерирайте** го от Dashboard
- Използвайте го **само** в backend сървъра, никога във frontend

## Проверка:

След обновяване, тествайте:

```bash
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     "https://ufpeftuanzmkiryohesd.supabase.co/rest/v1/offices?select=id&limit=1"
```

Трябва да получите JSON отговор с данни, не грешка "Invalid API key".

