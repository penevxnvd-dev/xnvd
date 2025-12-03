# 🔧 Apply RLS Policy Fix

This migration fixes Row-Level Security (RLS) policies to allow admin users to INSERT, UPDATE, and DELETE rows in all tables.

## The Problem

The RLS policies were missing the `WITH CHECK` clause, which is required for INSERT operations. Policies with `FOR ALL` need both:
- `USING` clause (for SELECT/UPDATE/DELETE on existing rows)
- `WITH CHECK` clause (for INSERT/UPDATE on new/modified rows)

## How to Apply

### Option 1: Supabase Dashboard (Recommended) ⭐

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (ID: `ufpeftuanzmkiryohesd`)
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20250102000000_fix_rls_policies.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify success - you should see "Success. No rows returned"

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
cd /home/hades/Music/xnvd
supabase db push
```

### Option 3: Manual SQL Execution

If you have direct database access, you can run the SQL file directly using `psql` or any PostgreSQL client.

## What This Fixes

This migration updates RLS policies for the following tables:
- ✅ `countries`
- ✅ `cities`
- ✅ `offices`
- ✅ `teams`
- ✅ `realtors`
- ✅ `deals`
- ✅ `diagnoses`
- ✅ `training_progress`
- ✅ `user_roles`

After applying this migration, admin users will be able to:
- ✅ INSERT new rows
- ✅ UPDATE existing rows
- ✅ DELETE rows
- ✅ SELECT rows (already working)

## Verification

After applying the migration, test by:
1. Logging in as an admin user
2. Trying to create a new country
3. It should work without the "new row violates row-level security policy" error

## Migration File Location

`supabase/migrations/20250102000000_fix_rls_policies.sql`

