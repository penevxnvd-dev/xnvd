# Създаване на мениджърски и ръководни акаунти

## Инструкции

### Вариант 1: Чрез SQL скрипт (Препоръчително)

#### Стъпка 1: Приложете миграцията

1. Отворете SQL Editor: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new
2. Копирайте съдържанието от `supabase/migrations/20251206000001_add_regional_manager.sql`
3. Поставете го в SQL Editor и изпълнете

#### Стъпка 2: Създайте потребителите в Authentication

1. Отворете: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/auth/users
2. Създайте следните потребители (Add User):
   - **krasi.katev@xnvd.com** / Парола: `Krasi123!`
   - **lazar.bundev@xnvd.com** / Парола: `Lazar123!`
   - **georgi.penev@xnvd.com** / Парола: `Georgi123!`
   - **kamen.georgiev@xnvd.com** / Парола: `Kamen123!`
3. За всеки потребител, маркирайте **"Auto Confirm User"** или потвърдете email ръчно

#### Стъпка 3: Изпълнете SQL скрипта

1. Отворете SQL Editor: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new
2. Копирайте съдържанието от `create-managers-accounts.sql`
3. Поставете го в SQL Editor и изпълнете

### Вариант 2: Чрез Node.js скрипт (Изисква Service Role Key)

#### Стъпка 1: Добавете Service Role Key в .env

1. Отворете: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/settings/api
2. Намерете **`service_role`** key в секцията "Project API keys"
3. Копирайте ключа
4. Добавете го в `.env` файла:
   ```env
   SUPABASE_SERVICE_ROLE_KEY="вашият-service-role-key-тук"
   ```

#### Стъпка 2: Приложете миграцията

1. Отворете SQL Editor: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new
2. Копирайте съдържанието от `supabase/migrations/20251206000001_add_regional_manager.sql`
3. Поставете го в SQL Editor и изпълнете

#### Стъпка 3: Изпълнете скрипта

```bash
node create-managers-accounts.js
```

## Създавани акаунти

Скриптът ще създаде следните акаунти:

1. **Краси Кътев** - Office Manager (Бургас)
   - Email: `krasi.katev@xnvd.com`
   - Парола: `Krasi123!`
   - Роля: `office_manager`
   - Град: Бургас

2. **Лазар Бундев** - Team Leader (Бургас)
   - Email: `lazar.bundev@xnvd.com`
   - Парола: `Lazar123!`
   - Роля: `team_leader`
   - Град: Бургас
   - Екип: Лазар Бундев

3. **Георги Пенев** - Team Leader (Бургас)
   - Email: `georgi.penev@xnvd.com`
   - Парола: `Georgi123!`
   - Роля: `team_leader`
   - Град: Бургас
   - Екип: Георги Пенев

4. **Камен Георгиев** - Regional Manager (Бургас, Пловдив)
   - Email: `kamen.georgiev@xnvd.com`
   - Парола: `Kamen123!`
   - Роля: `regional_manager`
   - Градове: Бургас, Пловдив

## Важни бележки

- Скриптът автоматично създава държава "България" ако не съществува
- Скриптът автоматично създава градове "Бургас" и "Пловдив" ако не съществуват
- Скриптът автоматично създава офиси и екипи ако не съществуват
- Ако акаунт вече съществува, скриптът ще обнови паролата и данните
- Миграцията трябва да бъде приложена преди изпълнение на скрипта за да работят всички функционалности

## След създаване

След успешно създаване на акаунтите, можете да влезете на:
- https://xnvd.vercel.app/auth

И да използвате email и паролата за всеки акаунт.

