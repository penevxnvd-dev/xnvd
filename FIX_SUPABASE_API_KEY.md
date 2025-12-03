# Поправка на Supabase API Key

## Проблем
Грешка: `Invalid API key` при опит за достъп до Supabase API.

## Решение

### Стъпка 1: Вземете правилния Service Role Key

1. Отидете в [Supabase Dashboard](https://supabase.com/dashboard)
2. Изберете проекта: `ufpeftuanzmkiryohesd`
3. Отидете в **Settings** > **API**
4. В секцията **Project API keys** намерете:
   - **`service_role`** key (секретен ключ - показва се само веднъж!)
   - **`anon`** key (публичен ключ)

### Стъпка 2: Обновете server/.env

Отворете `server/.env` и обновете:

```env
SUPABASE_URL="https://ufpeftuanzmkiryohesd.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="вашият-реален-service-role-key-от-dashboard"
SUPABASE_ANON_KEY="вашият-реален-anon-key-от-dashboard"
```

⚠️ **ВАЖНО**: 
- `service_role` key има пълни права и трябва да се пази в тайна
- Не споделяйте този ключ публично
- Ако сте го споделили, регенерирайте го от Dashboard

### Стъпка 3: Рестартирайте сървъра

```bash
cd /home/hades/Music/xnvd
./restart-app.sh
```

## Проверка

След обновяване, тествайте:

```bash
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     "https://ufpeftuanzmkiryohesd.supabase.co/rest/v1/offices?select=id&limit=1"
```

Трябва да получите JSON отговор с данни, не грешка.

