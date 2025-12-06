# 🚀 Apply RLS Migration - Quick Guide

## One-Liner (Fastest)

```bash
# 1. Get connection string from Supabase Dashboard:
#    https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/database
#    Copy the "URI" connection string

# 2. Apply migration:
export SUPABASE_DB_URL="your-connection-string-here" && \
psql "$SUPABASE_DB_URL" -f supabase/migrations/20250102000000_fix_rls_policies.sql
```

## Or Use the Script

```bash
./apply-with-psql.sh
```

The script will prompt you for the connection string if not set.

## What Gets Fixed

✅ All RLS policies for admin management (countries, cities, offices, teams, realtors, deals, diagnoses, training_progress, user_roles)

✅ Admin users can now INSERT, UPDATE, DELETE without errors

✅ Database ready for use!

