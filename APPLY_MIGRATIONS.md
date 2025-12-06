# Прилагане на миграции в Supabase

## 🚀 Бърз старт

### Стъпка 1: Отворете SQL Editor в Supabase

1. Отидете на: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new
2. Влезте в акаунта си в Supabase

### Стъпка 2: Копирайте и изпълнете миграцията

1. Отворете файла `apply-supabase-migrations.sql` в този проект
2. Копирайте **цялото** съдържание
3. Поставете го в SQL Editor в Supabase
4. Кликнете на **"Run"** или натиснете `Ctrl+Enter`

### Стъпка 3: Проверка

След изпълнение трябва да видите съобщение:
```
✅ Всички миграции са приложени успешно!
```

## 📋 Какво прави миграцията

### 1. Добавя нови роли
- `team_leader` - Ръководител на екип
- `office_manager` - Мениджър на офис
- `regional_manager` - Регионален мениджър

### 2. Добавя нови колони
- `cities.manager_id` - ID на регионалния мениджър
- `offices.manager_id` - ID на мениджъра на офиса

### 3. Създава RLS (Row Level Security) policies
- Позволява на team_leader да вижда само своя екип
- Позволява на office_manager да вижда само своя офис
- Позволява на regional_manager да вижда градовете, които управлява
- Позволява на всички роли да обновяват training progress за своите подчинени

## ⚠️ Важни бележки

- Миграцията е **идемпотентна** - може да се изпълни многократно без проблеми
- Използва `IF NOT EXISTS` проверки, за да не създава дубликати
- Ако някои части вече са приложени, те ще бъдат пропуснати

## 🔍 Проверка на резултата

След прилагане на миграцията, можете да проверите:

```sql
-- Проверка на ролите
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
ORDER BY enumsortorder;

-- Проверка на колоните
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cities' AND column_name = 'manager_id';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offices' AND column_name = 'manager_id';

-- Проверка на policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE '%manager%' OR policyname LIKE '%leader%'
ORDER BY tablename, policyname;
```

## 📝 Следващи стъпки

След прилагане на миграцията:

1. **Създайте мениджърски акаунти** - Използвайте `create-managers-accounts.sql` или `create-managers-accounts.js`
2. **Тествайте функционалността** - Влезте с различни роли и проверете дали виждат правилните данни
3. **Проверете RLS policies** - Уверете се, че всеки потребител вижда само данните, които трябва

## 🆘 Проблеми?

### Грешка: "role already exists"
- Това е нормално - ролята вече е добавена
- Миграцията ще пропусне тази стъпка

### Грешка: "column already exists"
- Това е нормално - колоната вече е добавена
- Миграцията ще пропусне тази стъпка

### Грешка: "policy already exists"
- Това е нормално - policy-то вече е създадено
- Миграцията ще пропусне тази стъпка

### Други грешки
- Проверете дали имате права за изпълнение на SQL в Supabase
- Уверете се, че сте влезли като администратор на проекта
- Проверете логовете в Supabase Dashboard > Logs

## 📚 Допълнителна информация

- Пълният SQL скрипт: `apply-supabase-migrations.sql`
- Индивидуални миграции: `supabase/migrations/`
- Документация за ролите: `CREATE_MANAGERS_README.md`

