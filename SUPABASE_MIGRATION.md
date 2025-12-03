# Supabase Migration Complete

This project has been fully migrated from Express.js backend to Supabase. All API calls now go directly to Supabase instead of through the Express server.

## What Changed

### 1. New Supabase API Client
- Created `/src/lib/supabaseApi.ts` - A new API client that uses Supabase directly
- Replaces the old `/src/lib/api.ts` which called Express endpoints
- All methods use Supabase client with proper authentication and RLS policies

### 2. Authentication
- Now uses Supabase Auth directly (`supabase.auth.signInWithPassword`, `supabase.auth.signUp`)
- No more JWT tokens stored in localStorage - Supabase handles session management
- Updated `useUserRole` hook to listen to Supabase auth state changes

### 3. Database Functions
- Created RPC functions in Supabase for KPI calculations:
  - `get_realtor_kpi(p_realtor_id UUID)`
  - `get_team_kpi(p_team_id UUID)`
  - `get_office_kpi(p_office_id UUID)`
  - `get_city_kpi(p_city_id UUID)`
  - `get_country_kpi(p_country_id UUID)`
- These functions are defined in `/supabase/migrations/20250101000000_add_kpi_functions.sql`

### 4. Updated Components
All frontend components have been updated to use `supabaseApi` instead of `api`:
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/realtor/RealtorDashboard.tsx`
- `src/pages/realtor/TrainingPage.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/LevelDetailPage.tsx`
- `src/pages/Index.tsx`
- `src/components/admin/CreateEditDialog.tsx`
- `src/components/cards/*.tsx` (all KPI card components)
- `src/hooks/useUserRole.ts`

## Environment Variables

Make sure you have these environment variables set:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

These should be in your `.env` file in the root directory.

## Database Migration

The database schema is already set up in Supabase. To apply the new KPI functions:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration file:
# supabase/migrations/20250101000000_add_kpi_functions.sql
```

## Backend Server

The Express.js backend server (`/server`) is no longer needed for the frontend. However, it can still be used for:
- Admin operations that require service role key
- Background jobs
- Webhooks

If you want to remove it completely, you can delete the `/server` directory, but it's recommended to keep it for admin scripts.

## Testing

1. **Authentication**: Test login and registration
2. **Data Fetching**: Verify all CRUD operations work
3. **KPI Calculations**: Check that KPI cards display correct data
4. **Training Progress**: Ensure training progress saves correctly
5. **RLS Policies**: Verify that users can only access their own data

## Benefits

1. **Simplified Architecture**: No need to maintain a separate Express server
2. **Better Security**: Row Level Security (RLS) policies enforced at database level
3. **Real-time Capabilities**: Can easily add real-time subscriptions if needed
4. **Scalability**: Supabase handles scaling automatically
5. **Reduced Latency**: Direct database connections instead of going through Express

## Next Steps

1. Update environment variables in your deployment
2. Run the database migration to add KPI functions
3. Test all functionality
4. Consider removing Express server if not needed
5. Optionally add real-time subscriptions for live updates

