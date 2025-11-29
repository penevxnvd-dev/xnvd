# Миграция от Supabase към PostgreSQL + Express.js

## Стъпки за миграция

### 1. Инсталиране на зависимости

```bash
# Backend
cd server
npm install

# Frontend (в root директорията)
npm install
```

### 2. Настройка на база данни

1. Инсталирайте PostgreSQL
2. Създайте база данни:
```sql
CREATE DATABASE xnvd;
```

3. Конфигурирайте `.env` в `server/`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/xnvd?schema=public"
JWT_SECRET="your-secret-key"
PORT=3001
```

### 3. Прилагане на миграции

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

### 4. Стартиране на backend сървъра

```bash
cd server
npm run dev
```

### 5. Конфигуриране на frontend

Добавете в `.env` (root директория):
```env
VITE_API_URL=http://localhost:3001/api
```

### 6. Заменяне на Supabase заявки

Всички компоненти трябва да използват `api` client от `src/lib/api.ts` вместо `supabase`.

Пример:
```typescript
// Старо (Supabase)
const { data } = await supabase.from('countries').select('*');

// Ново (API)
const data = await api.getCountries();
```

## Важни бележки

1. **Authentication**: Сега използва JWT токени вместо Supabase Auth
2. **Password Storage**: Трябва да се добави отделна таблица за пароли (в момента е опростено)
3. **RLS Policies**: Сега се управляват от middleware в Express.js
4. **Real-time**: Няма real-time функционалност (може да се добави с WebSockets)

## Следващи стъпки

1. Добавете таблица `users` за пароли
2. Имплементирайте password reset
3. Добавете email verification
4. Добавете rate limiting
5. Добавете logging
6. Добавете тестове

