# Синхронизация на данни от Supabase към Prisma

Този скрипт синхронизира всички данни от Supabase базата данни към локалната Prisma база данни.

## Използване

```bash
cd server
npm run sync:supabase-to-prisma
```

## Какво синхронизира

Скриптът синхронизира следните таблици в този ред (за да се спазят foreign key ограниченията):

1. **profiles** - Профили на потребители
2. **user_roles** - Роли на потребители
3. **countries** - Държави
4. **cities** - Градове
5. **offices** - Офиси
6. **teams** - Екипи
7. **realtors** - Реализатори
8. **deals** - Сделки
9. **diagnoses** - Диагнози
10. **training_progress** - Напредък в обучението
11. **realtor_goals** - Лични цели на реализатори
12. **buyer_schedule** - График с купувачи

## Конфигурация

Скриптът изисква следните environment variables в `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://user:password@localhost:5432/xnvd
```

## Как работи

- Скриптът използва `upsert` операции, което означава, че:
  - Ако записът съществува (по ID или unique constraint), той се обновява
  - Ако записът не съществува, той се създава
- Всички данни се запазват с оригиналните ID-та от Supabase
- Скриптът обработва грешки за всеки запис поотделно, така че ако един запис не успее, останалите продължават

## Изход

Скриптът показва:
- Прогрес за всяка таблица
- Брой синхронизирани записи
- Грешки (ако има такива)
- Обща статистика в края

## Примерен изход

```
🚀 Започване на синхронизация от Supabase към Prisma...
📍 Supabase URL: https://your-project.supabase.co
✅ Успешно свързване с Supabase

📥 Синхронизиране на profiles...
  ✅ Синхронизирани 10 profiles
📥 Синхронизиране на user_roles...
  ✅ Синхронизирани 10 user_roles
...

✅ Синхронизацията завърши успешно!

📊 Статистика:
  Profiles: 10
  User Roles: 10
  Countries: 1
  Cities: 5
  Offices: 3
  Teams: 2
  Realtors: 8
  Deals: 25
  Diagnoses: 15
  Training Progress: 50
  Realtor Goals: 8
  Buyer Schedule: 20
```

## Забележки

- Скриптът не изтрива данни от Prisma базата данни - само добавя или обновява
- Ако искате пълна синхронизация (включително изтриване на записи, които не са в Supabase), ще трябва да модифицирате скрипта
- Убедете се, че Prisma базата данни има правилната схема преди изпълнение на скрипта

