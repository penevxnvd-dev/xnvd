# ✅ RLS Policy Fix - Ready to Apply

The migration to fix RLS policies is ready. Here's how to apply it:

## Quick Apply (Recommended)

### Option 1: Using Node.js Script (Fastest)

1. **Get your Supabase database connection string:**
   - Go to: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/settings/database
   - Scroll to "Connection string" section
   - Select "URI" format
   - Copy the connection string (looks like: `postgresql://postgres.[ref]:[password]@...`)

2. **Set it as environment variable and run:**
   ```bash
   export SUPABASE_DB_URL="your-connection-string-here"
   node run-migration.js
   ```

### Option 2: Supabase Dashboard (No setup needed)

1. Go to: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new
2. Copy the entire contents of: `supabase/migrations/20250102000000_fix_rls_policies.sql`
3. Paste into the SQL Editor
4. Click "Run" (or press Ctrl+Enter)
5. Done! ✅

## What This Fixes

This migration fixes the "new row violates row-level security policy" error by adding the required `WITH CHECK` clause to all admin management policies.

**Fixed tables:**
- ✅ countries
- ✅ cities  
- ✅ offices
- ✅ teams
- ✅ realtors
- ✅ deals
- ✅ diagnoses
- ✅ training_progress
- ✅ user_roles

**After applying:**
- Admin users can INSERT, UPDATE, DELETE rows
- No more RLS policy violations
- Database is ready for use

## Files Created

- ✅ `supabase/migrations/20250102000000_fix_rls_policies.sql` - Migration SQL
- ✅ `run-migration.js` - Automated script to apply migration
- ✅ `APPLY_RLS_FIX.md` - Detailed instructions
- ✅ `MIGRATION_READY.md` - This file

## Verification

After applying, test by:
1. Logging in as an admin user
2. Creating a new country
3. It should work without errors! ✅

