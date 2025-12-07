# Removing Hardcoded Data

This document tracks the removal of hardcoded data from the application.

## Changes Made:
1. Removed hardcoded data imports from `supabaseApi.ts`
2. Changed priority: Supabase (primary) → Local backup (fallback)
3. Removed hardcoded login logic
4. Removed hardcoded session handling
5. Updated `useUserRole.ts` to not use hardcoded sessions

## Files Modified:
- `src/lib/supabaseApi.ts` - Removed all hardcoded data usage
- `src/hooks/useUserRole.ts` - Removed hardcoded session handling

## Files to Keep:
- `src/lib/hardcodedData.ts` - Keep for reference but not used
- `src/lib/localBackup.ts` - Keep as fallback mechanism
- `local-backup/` - Keep for offline fallback

