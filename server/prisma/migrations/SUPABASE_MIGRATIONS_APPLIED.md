# Supabase Migrations Applied to Prisma Database

This document describes the functions and triggers that were applied from Supabase migrations to the Prisma-managed PostgreSQL database.

## Applied Functions

### Helper Functions

1. **`has_role(_user_id UUID, _role app_role)`**
   - Checks if a user has a specific role
   - Returns: `BOOLEAN`
   - Used for role-based access control

2. **`get_realtor_id(_user_id UUID)`**
   - Gets the realtor ID for a given user ID
   - Returns: `UUID`
   - Used to find realtor records from user profiles

3. **`update_updated_at_column()`**
   - Trigger function that automatically updates the `updated_at` timestamp
   - Used by triggers on `profiles`, `realtors`, and `training_progress` tables

### KPI Calculation Functions

All KPI functions calculate metrics for the current month and return JSON with:
- `realtors`: Count of realtors
- `deals`: Count of deals
- `diagnoses`: Count of diagnoses
- `successRate`: Success rate percentage (deals / diagnoses * 100)
- `totalDealValue`: Total value of all deals
- `levelDistribution`: JSON object with level distribution

1. **`get_realtor_kpi(p_realtor_id UUID)`**
   - Calculates KPI for a specific realtor
   - Returns metrics for the current month

2. **`get_team_kpi(p_team_id UUID)`**
   - Calculates KPI for a team (aggregates all realtors in the team)
   - Includes level distribution

3. **`get_office_kpi(p_office_id UUID)`**
   - Calculates KPI for an office (aggregates all teams in the office)
   - Includes level distribution

4. **`get_city_kpi(p_city_id UUID)`**
   - Calculates KPI for a city (aggregates all offices in the city)
   - Includes level distribution

5. **`get_country_kpi(p_country_id UUID)`**
   - Calculates KPI for a country (aggregates all cities in the country)
   - Includes level distribution

## Applied Triggers

1. **`update_profiles_updated_at`**
   - Automatically updates `updated_at` on `profiles` table before UPDATE

2. **`update_realtors_updated_at`**
   - Automatically updates `updated_at` on `realtors` table before UPDATE

3. **`update_training_progress_updated_at`**
   - Automatically updates `updated_at` on `training_progress` table before UPDATE

## Usage Examples

### Get Realtor KPI
```sql
SELECT get_realtor_kpi('realtor-uuid-here');
```

### Get Team KPI
```sql
SELECT get_team_kpi('team-uuid-here');
```

### Check User Role
```sql
SELECT has_role('user-uuid-here', 'admin'::app_role);
```

## Notes

- All functions use `SECURITY DEFINER` to run with elevated privileges
- All functions set `search_path = public` for security
- RLS (Row Level Security) policies were NOT applied as we're using JWT authentication instead of Supabase Auth
- GRANT statements for `authenticated` role were skipped as that role doesn't exist in our setup

## Migration Files Applied

1. `supabase/migrations/20251129111411_d0967e6d-88a3-4bbc-8c45-d8dfacf2b54c.sql` - Base schema (already in Prisma)
2. `supabase/migrations/20251129111444_f07316d8-c975-4465-9ed5-de65b1e519e4.sql` - Trigger function fix
3. `supabase/migrations/20250101000000_add_kpi_functions.sql` - KPI functions

## Files Created

- `server/prisma/migrations/apply_supabase_functions.sql` - Combined migration script

