# Account Testing Summary

Каноничен документ за тест на роли и достъп.

## Supported Roles

- `admin`
- `realtor`
- `team_leader`
- `office_manager`
- `regional_manager`

## Manual Test Flow

1. Стартирай app:
   ```bash
   npm run dev
   ```
2. Влез през `/auth` с тестов акаунт.
3. Потвърди, че:
   - се отваря правилният dashboard
   - вижда само позволените данни
   - logout работи

## Checklist

- [ ] Login успешен
- [ ] Правилен dashboard по роля
- [ ] Няма runtime errors
- [ ] Данните са ограничени според ролята (RLS/permissions)
- [ ] Update действията минават само за позволени роли

## Useful SQL Checks

```sql
select u.email, p.full_name, ur.role
from auth.users u
left join public.profiles p on p.id = u.id
left join public.user_roles ur on ur.user_id = u.id
order by u.email;
```

```sql
select count(*) from public.realtors;
```

