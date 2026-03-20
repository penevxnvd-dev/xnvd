# How To Get Service Role Key

## 1) Open Supabase API Settings

- Supabase Dashboard -> Project -> `Settings` -> `API`
- В секцията `Project API keys` копирайте `service_role` ключа.

## 2) Add To Environment

В `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 3) Security Rules

- Не commit-вайте ключа в Git
- Не го показвайте във frontend
- Ползвайте го само за backend/admin scripts
- Този ключ bypass-ва RLS и има пълен достъп

## 4) Quick Validation

След добавяне на ключа, пуснете admin script, който чете/създава users.
Ако минава без `401`/`403`, ключът е валиден.

