# 🚀 XNVD - Готово за използване

## ⚡ Бърз старт (3 стъпки)

### 1️⃣ Настройка на база данни

```bash
# Стартирайте PostgreSQL (ако не работи)
sudo systemctl start postgresql

# Създайте база данни
sudo -u postgres psql
CREATE DATABASE xnvd;
\q
```

### 2️⃣ Backend настройка

```bash
cd server

# Конфигурирайте .env (вече създаден с примерни стойности)
# Редактирайте DATABASE_URL ако е необходимо

# Инсталиране (вече направено)
# npm install

# Инициализация на базата данни
./scripts/init-db.sh

# Създаване на админски акаунт
node scripts/create-admin.js

# Стартиране
npm run dev
```

### 3️⃣ Frontend настройка

```bash
# В root директорията
# VITE_API_URL вече е добавен в .env

# Стартиране (вече работи на порт 5174)
npm run dev
```

## 📋 Админски акаунт

След изпълнение на `node server/scripts/create-admin.js`:

- **Email:** `admin@xnvd.com`
- **Парола:** `Admin123!`
- **URL:** http://localhost:5174/auth

## 🔧 Конфигурация

### Backend (.env в `server/`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xnvd?schema=public"
JWT_SECRET="xnvd-super-secret-jwt-key-change-in-production-2024"
PORT=3001
CORS_ORIGIN="http://localhost:5174"
```

### Frontend (.env в root)
```env
VITE_API_URL=http://localhost:3001/api
```

## 📁 Структура

```
xnvd-main/
├── server/              # Backend (Express.js + Prisma)
│   ├── src/            # Source code
│   ├── prisma/         # Database schema & migrations
│   └── scripts/        # Utility scripts
│       ├── init-db.sh  # Инициализация на базата
│       └── create-admin.js  # Създаване на админ
└── src/                # Frontend (React)
    └── lib/
        └── api.ts      # API client
```

## ✅ Проверка

1. Backend работи: http://localhost:3001/api/health
2. Frontend работи: http://localhost:5174
3. Влезте с админския акаунт

## 🐛 Проблеми?

**База данни не се свързва:**
```bash
# Проверете дали PostgreSQL работи
sudo systemctl status postgresql

# Стартирайте ако не работи
sudo systemctl start postgresql
```

**Backend не стартира:**
- Проверете дали порт 3001 е свободен
- Проверете DATABASE_URL в `server/.env`

**Frontend не се свързва:**
- Проверете VITE_API_URL в `.env`
- Уверете се, че backend работи

## 📚 Документация

- `SETUP.md` - Пълни инструкции
- `QUICK_START.md` - Бърз старт
- `MIGRATION_COMPLETE.md` - Детайли за миграцията
- `server/README.md` - Backend документация


