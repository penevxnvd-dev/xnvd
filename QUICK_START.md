# ⚡ Бърз старт - XNVD

## Стъпка 1: Настройка на база данни

```bash
# Създайте PostgreSQL база данни
sudo -u postgres psql
CREATE DATABASE xnvd;
\q
```

## Стъпка 2: Конфигуриране

### Backend (.env в server/)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xnvd?schema=public"
JWT_SECRET="xnvd-secret-key-2024"
PORT=3001
CORS_ORIGIN="http://localhost:5174"
```

### Frontend (.env в root/)
```env
VITE_API_URL=http://localhost:3001/api
```

## Стъпка 3: Инсталиране и стартиране

### Backend
```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev
node scripts/create-admin.js
npm run dev
```

### Frontend (в нов терминал)
```bash
npm run dev
```

## Стъпка 4: Вход

Отворете: http://localhost:5174/auth

**Админски акаунт:**
- Email: `admin@xnvd.com`
- Password: `Admin123!`

## Готово! 🎉

Приложението е готово за използване!


