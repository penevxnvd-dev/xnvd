# Статус на проекта XNVD

**Дата:** 2025-12-06  
**Supabase проект:** https://qxompdwqdnemsntssjot.supabase.co

## ✅ Приложени миграции

1. **initial_schema_setup** - Първоначална схема с всички таблици
2. **add_new_roles_enum_only** - Добавена роля `team_leader`
3. **add_office_manager_role** - Добавена роля `office_manager`
4. **add_regional_manager_role** - Добавена роля `regional_manager`
5. **add_manager_columns_and_policies** - Добавени колони `manager_id` и RLS policies

## 📊 База данни

### Таблици (14)
- ✅ profiles
- ✅ user_roles
- ✅ countries
- ✅ cities (с `manager_id` колона)
- ✅ offices (с `manager_id` колона)
- ✅ teams
- ✅ realtors
- ✅ deals
- ✅ diagnoses
- ✅ training_progress
- ✅ realtor_goals
- ✅ buyer_schedule
- ✅ messages

### Роли (5)
- ✅ admin
- ✅ realtor
- ✅ team_leader
- ✅ office_manager
- ✅ regional_manager

### Функции
- ✅ `has_role()` - Проверка за роли
- ✅ `get_realtor_id()` - Получаване на realtor ID
- ✅ `update_updated_at_column()` - Автоматично обновяване на timestamps
- ✅ `handle_new_user()` - Автоматично създаване на профил при регистрация

## ⚠️ Предупреждения за производителност

### 1. Липсващи индекси на Foreign Keys
Следните foreign keys нямат индекси (може да забавят заявките):
- `buyer_schedule.realtor_id`
- `cities.country_id`
- `deals.realtor_id`
- `diagnoses.realtor_id`
- `offices.city_id`
- `realtors.team_id`
- `teams.leader_id`
- `teams.office_id`

### 2. RLS Performance Issues
Много RLS policies използват `auth.uid()` директно вместо `(select auth.uid())`, което може да забави заявките при голям обем данни.

**Препоръка:** Обновете policies да използват `(select auth.uid())` за по-добра производителност.

### 3. Множество Permissive Policies
Някои таблици имат множество permissive policies за същия action, което може да забави заявките.

## 🔒 Сигурност

- ✅ RLS е активиран на всички таблици
- ✅ Всички таблици имат RLS policies
- ⚠️ Функцията `update_updated_at_column()` има mutable search_path (нисък приоритет)

## 📋 Следващи стъпки

1. **Създаване на акаунти:**
   - Добавете `SUPABASE_SERVICE_ROLE_KEY` в `.env`
   - Изпълнете: `node create-managers-accounts.js`

2. **Подобряване на производителността (опционално):**
   - Добавете индекси на foreign keys
   - Обновете RLS policies да използват `(select auth.uid())`
   - Обединяване на множествените permissive policies

3. **Тестване:**
   - Тествайте влизане с различни роли
   - Проверете RLS policies
   - Тествайте функционалността на мениджърските dashboards

## 🔗 Полезни линкове

- **Dashboard:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot
- **SQL Editor:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new
- **API Settings:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api
- **Database Settings:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/database

