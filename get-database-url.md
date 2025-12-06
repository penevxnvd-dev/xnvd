# Как да получите DATABASE_URL за миграциите

## Стъпка 1: Отворете Database Settings

1. Отидете на: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/database
2. Влезте в акаунта си в Supabase

## Стъпка 2: Намерете Connection String

1. Скролнете до секцията **"Connection string"**
2. Изберете таб **"Connection pooling"**
3. Изберете режим **"Session mode"**
4. Копирайте connection string-а

## Стъпка 3: Добавете в .env

Добавете следния ред в `.env` файла:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Или** използвайте директния connection string (без pooling):

```env
DATABASE_URL=postgresql://postgres:[password]@db.qxompdwqdnemsntssjot.supabase.co:5432/postgres
```

## Стъпка 4: Изпълнете миграцията

```bash
node run-migration.js
```

Или:

```bash
node run-migrations.js  # (символна връзка)
```

## Важно

- Паролата е чувствителна информация - не я споделяйте
- Използвайте "Session mode" за по-добра производителност
- Connection string-ът трябва да е на един ред в .env файла

