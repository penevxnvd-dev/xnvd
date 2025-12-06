# Обновяване на SUPABASE_SERVICE_ROLE_KEY

## Текущ статус

✅ Обновени:
- `SUPABASE_URL` - правилно настроен
- `SUPABASE_ANON_KEY` - правилно настроен

⚠️ Липсва:
- `SUPABASE_SERVICE_ROLE_KEY` - трябва да се замени с реален ключ

## Стъпки за обновяване

1. **Вземете Service Role Key от Supabase Dashboard:**
   - Отидете: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api
   - В секцията **Project API keys** намерете **`service_role`** key
   - Копирайте ключа (започва с `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

2. **Обновете `server/.env`:**
   ```bash
   cd /home/hades/Music/xnvd/server
   nano .env
   ```
   
   Намерете реда:
   ```env
   SUPABASE_SERVICE_ROLE_KEY="REPLACE_WITH_REAL_SERVICE_ROLE_KEY_FROM_DASHBOARD"
   ```
   
   И го заменете с:
   ```env
   SUPABASE_SERVICE_ROLE_KEY="вашият-реален-service-role-key-тук"
   ```

3. **Рестартирайте сървъра:**
   ```bash
   cd /home/hades/Music/xnvd
   ./restart-app.sh
   ```

## Проверка

След обновяване, проверете логовете:
```bash
tail -f /tmp/xnvd-backend.log
```

Не трябва да виждате warning за липсващ `SUPABASE_SERVICE_ROLE_KEY`.

## Важно

- `service_role` key има **пълни права** и заобикаля всички RLS policies
- **НЕ споделяйте** този ключ публично
- Използвайте го **само** в backend сървъра

