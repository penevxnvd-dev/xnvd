# 🚀 Инструкции за настройка на XNVD

## Бърз старт

### 1. Настройка на база данни

```bash
# Инсталирайте PostgreSQL (ако нямате)
sudo apt-get install postgresql postgresql-contrib

# Създайте база данни
sudo -u postgres psql
CREATE DATABASE xnvd;
CREATE USER xnvd_user WITH PASSWORD 'xnvd_password';
GRANT ALL PRIVILEGES ON DATABASE xnvd TO xnvd_user;
\q
```

### 2. Конфигуриране на Backend

```bash
cd server

# Копирайте .env.example към .env (ако няма)
cp .env.example .env

# Редактирайте .env и задайте:
# DATABASE_URL="postgresql://xnvd_user:xnvd_password@localhost:5432/xnvd?schema=public"
# JWT_SECRET="your-secret-key-here"
```

### 3. Инсталиране и настройка

```bash
# Backend
cd server
npm install
npx prisma generate
npx prisma migrate dev

# Създаване на админски акаунт
node scripts/create-admin.js

# Стартиране на backend
npm run dev
```

Backend ще работи на `http://localhost:3001`

### 4. Конфигуриране на Frontend

```bash
# В root директорията
# Добавете в .env:
echo "VITE_API_URL=http://localhost:3001/api" >> .env

# Инсталиране (ако не е направено)
npm install

# Стартиране
npm run dev
```

Frontend ще работи на `http://localhost:5174`

## Админски акаунт

След изпълнение на `node server/scripts/create-admin.js`:

- **Email:** `admin@xnvd.com`
- **Парола:** `Admin123!`
- **Роля:** `admin`

## Структура

```
xnvd-main/
├── server/          # Backend (Express.js + Prisma)
│   ├── src/        # Source code
│   ├── prisma/     # Database schema
│   └── scripts/    # Utility scripts
└── src/            # Frontend (React + TypeScript)
    └── lib/
        └── api.ts  # API client
```

## Проблеми?

1. **База данни не се свързва:**
   - Проверете DATABASE_URL в `server/.env`
   - Уверете се, че PostgreSQL работи: `sudo systemctl status postgresql`

2. **Backend не стартира:**
   - Проверете дали порт 3001 е свободен
   - Проверете дали всички зависимости са инсталирани

3. **Frontend не може да се свърже с backend:**
   - Проверете VITE_API_URL в `.env`
   - Уверете се, че backend сървърът работи

## Production

За production:
1. Променете JWT_SECRET на сигурен ключ
2. Настройте правилни CORS origins
3. Използвайте environment variables за чувствителни данни
4. Настройте SSL/TLS
5. Използвайте production database


