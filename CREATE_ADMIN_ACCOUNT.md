# Create Admin Account

Каноничен документ за създаване на admin потребител.

## Option A (Recommended): Supabase Dashboard + SQL

1. Създайте user в `auth.users` (Dashboard -> Authentication -> Users):
   - Email: `admin@xnvd.com`
   - Password: задайте сигурна парола
   - Auto Confirm: enabled

2. Изпълнете SQL в SQL Editor:

```sql
insert into public.profiles (id, full_name, email)
select id, 'Администратор', 'admin@xnvd.com'
from auth.users
where email = 'admin@xnvd.com'
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

insert into public.user_roles (user_id, role)
select id, 'admin'::app_role
from auth.users
where email = 'admin@xnvd.com'
on conflict do nothing;
```

## Option B: Script

- Нужен е `SUPABASE_SERVICE_ROLE_KEY` в `.env`.
- Стартирайте admin script-а за акаунт създаване.

## Verify

```sql
select u.email, p.full_name, ur.role
from auth.users u
left join public.profiles p on p.id = u.id
left join public.user_roles ur on ur.user_id = u.id
where u.email = 'admin@xnvd.com';
```

