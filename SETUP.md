# XNVD Setup Guide

Този файл е каноничният документ за старт и локална настройка.

## 1) Prerequisites

- Node.js 18+
- npm
- PostgreSQL (ако ползвате локална база)

## 2) Configure Environment

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### Backend (`server/.env`, ако ползвате backend)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/xnvd?schema=public
JWT_SECRET=change-me
```

## 3) Install Dependencies

```bash
npm install
cd server && npm install
```

## 4) Start App

### Frontend

```bash
npm run dev
```

### Backend (optional, ако ползвате server API)

```bash
cd server
npm run dev
```

## 5) Database and Migrations

- За Supabase/SQL миграции: виж `MIGRATION_GUIDE.md`.
- За service role key: виж `HOW_TO_GET_SERVICE_ROLE_KEY.md`.

## 6) Accounts

- За admin акаунт: виж `CREATE_ADMIN_ACCOUNT.md`.
- За тестване на роли: виж `ACCOUNT_TESTING_SUMMARY.md`.

## Troubleshooting

- Ако app не тръгва: провери `.env` стойностите и портовете.
- Ако няма данни: провери дали миграциите са приложени.
- Ако login не работи: провери `auth.users`, `profiles`, `user_roles`.


