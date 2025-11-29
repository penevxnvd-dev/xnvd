# XNVD Backend Server

Express.js backend сървър с Prisma ORM и PostgreSQL база данни.

## Инсталация

```bash
cd server
npm install
```

## Конфигурация

1. Копирайте `.env.example` към `.env`:
```bash
cp .env.example .env
```

2. Редактирайте `.env` и задайте:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Секретен ключ за JWT токени
- `PORT` - Порт на сървъра (по подразбиране 3001)

## База данни

### Създаване на база данни

```bash
# Създайте PostgreSQL база данни
createdb xnvd

# Или използвайте psql
psql -U postgres
CREATE DATABASE xnvd;
```

### Миграции

```bash
# Генериране на Prisma Client
npm run prisma:generate

# Прилагане на миграции
npm run prisma:migrate

# Отваряне на Prisma Studio (GUI за база данни)
npm run prisma:studio
```

## Стартиране

```bash
# Development режим (с hot reload)
npm run dev

# Production режим
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущ потребител

### Countries
- `GET /api/countries` - Всички държави
- `POST /api/countries` - Създаване (admin)
- `PUT /api/countries/:id` - Обновяване (admin)
- `DELETE /api/countries/:id` - Изтриване (admin)

### Cities
- `GET /api/cities/country/:countryId` - Градове по държава
- `POST /api/cities` - Създаване (admin)
- `PUT /api/cities/:id` - Обновяване (admin)
- `DELETE /api/cities/:id` - Изтриване (admin)

### Offices
- `GET /api/offices/city/:cityId` - Офиси по град
- `POST /api/offices` - Създаване (admin)
- `PUT /api/offices/:id` - Обновяване (admin)
- `DELETE /api/offices/:id` - Изтриване (admin)

### Teams
- `GET /api/teams/office/:officeId` - Екипи по офис
- `POST /api/teams` - Създаване (admin)
- `PUT /api/teams/:id` - Обновяване (admin)
- `DELETE /api/teams/:id` - Изтриване (admin)

### Realtors
- `GET /api/realtors/team/:teamId` - Реализатори по екип
- `GET /api/realtors/me` - Текущ реализатор
- `POST /api/realtors` - Създаване (admin)

### Deals
- `GET /api/deals/me` - Моите сделки
- `POST /api/deals` - Създаване на сделка

### Diagnoses
- `GET /api/diagnoses/me` - Моите диагнози
- `POST /api/diagnoses` - Създаване на диагноза

### Training
- `GET /api/training/progress` - Обучителен прогрес
- `PUT /api/training/progress` - Обновяване на прогрес

## Автентикация

Всички endpoints (освен `/api/auth/*`) изискват JWT токен в header:
```
Authorization: Bearer <token>
```

Токенът се получава при login/register и се запазва в localStorage от frontend-а.

## Роли

- **admin** - Пълен достъп до всички операции
- **realtor** - Достъп само до собствените данни

