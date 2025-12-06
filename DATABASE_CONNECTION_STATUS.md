# Статус на връзката с базата данни

**Дата:** 2025-12-06  
**Supabase проект:** https://qxompdwqdnemsntssjot.supabase.co

## ✅ Връзката е конфигурирана

### Environment Variables

Приложението е конфигурирано с:
- ✅ `VITE_SUPABASE_URL=https://qxompdwqdnemsntssjot.supabase.co`
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (за административни операции)

### Текущи данни в базата

- ✅ 1 държава (България)
- ✅ 2 града (Бургас, Пловдив)
- ✅ 1 офис (Офис Бургас)
- ✅ 2 екипа (Лазар Бундев, Георги Пенев)
- ✅ 4 профила (всички мениджъри)
- ✅ 4 роли (office_manager, 2x team_leader, regional_manager)

## 🔌 Как работи връзката

### Frontend (React App)

Приложението използва:
- `src/integrations/supabase/client.ts` - Supabase client с anon key
- `src/lib/supabaseApi.ts` - API wrapper за всички операции
- `src/lib/env.ts` - Валидация на environment variables

### Backend (Server - ако се използва)

Сървърът използва:
- `server/src/lib/supabase.ts` - Supabase client с service role key
- За административни операции които обхождат RLS

## 🔒 Row Level Security (RLS)

Всички таблици имат RLS активиран. Това означава:
- **Anon потребители** (неauthenticated) не могат да четат данни
- **Authenticated потребители** могат да четат според техните роли
- **Service Role Key** обхожда всички RLS policies

## 🧪 Тестване на връзката

### Тест 1: Проверка на credentials
```bash
node test-db-connection.js
```

### Тест 2: Стартиране на приложението
```bash
npm run dev
```

След това:
1. Отворете http://localhost:5173
2. Опитайте се да влезете с някой от създадените акаунти
3. Проверете дали данните се зареждат правилно

## 📋 Създадени акаунти за тест

1. **Краси Кътев** - Office Manager
   - Email: `krasi.katev@xnvd.com`
   - Password: `Krasi123!`

2. **Лазар Бундев** - Team Leader
   - Email: `lazar.bundev@xnvd.com`
   - Password: `Lazar123!`

3. **Георги Пенев** - Team Leader
   - Email: `georgi.penev@xnvd.com`
   - Password: `Georgi123!`

4. **Камен Георгиев** - Regional Manager
   - Email: `kamen.georgiev@xnvd.com`
   - Password: `Kamen123!`

## ✅ Всичко е готово!

Базата данни е свързана и готова за използване. Приложението може да:
- ✅ Създава и управлява потребители
- ✅ Чете и записва данни според RLS policies
- ✅ Работи с различните роли
- ✅ Показва dashboards според ролята

## 🚀 Стартиране на приложението

```bash
npm run dev
```

След това отворете http://localhost:5173 и влезте с някой от акаунтите.

