# Как да получите Service Role Key

## 📍 Стъпка 1: Отворете API Settings

1. Отидете на Supabase Dashboard:
   **https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api**

2. Или навигирайте ръчно:
   - Отворете: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot
   - В лявото меню кликнете на **"Settings"** (⚙️)
   - Кликнете на **"API"** в подменюто

## 📍 Стъпка 2: Намерете Service Role Key

1. Скролнете надолу до секцията **"Project API keys"**

2. Ще видите два ключа:
   - **`anon` `public`** - Това е публичният (anon) ключ (вече го имате в `.env`)
   - **`service_role` `secret`** - Това е Service Role Key (който търсите)

3. Намерете ключа с етикет **`service_role` `secret`**

4. Кликнете на иконата за копиране (📋) до ключа

## 📍 Стъпка 3: Добавете в .env

Отворете `.env` файла и добавете:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Или:**

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## ⚠️ Важно за сигурността

- **Service Role Key е МНОГО чувствителен!**
- Той обхожда всички Row Level Security (RLS) policies
- Може да чете и променя всички данни в базата
- **НИКОГА не го:**
  - Споделяйте публично
  - Commit-вайте в Git
  - Използвайте във frontend код
  - Показвайте в скрийншоти или видео

- **Използвайте го само за:**
  - Административни скриптове (като `create-managers-accounts.js`)
  - Backend сървъри
  - Server-side операции

## 🔍 Как да проверите дали работи

След като добавите ключа в `.env`, изпълнете:

```bash
node create-accounts-complete.js
```

Ако ключът е правилен, скриптът ще създаде всички акаунти автоматично.

## 📝 Алтернатива: Ръчно създаване

Ако не искате да използвате Service Role Key, можете да създадете акаунтите ръчно:

1. Създайте auth users в Dashboard: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users
2. След това изпълнете SQL скрипта `setup-accounts-after-auth.sql` в SQL Editor

## 🔗 Директни линкове

- **API Settings:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api
- **Auth Users:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users
- **SQL Editor:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new

