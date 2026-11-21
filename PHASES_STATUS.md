# XNVD Fix Phases — Status

## Phase 1 — High (done in code)
- [x] Auto-sync schedule disabled (manual trigger only)
- [ ] RLS review — anon key can still read profiles/roles/offices/teams. Policies need tightening in Supabase dashboard.
- [ ] Duplicate “Офис Пловдив” — REST update returned 204 but name unchanged (RLS or trigger). Run manually:
  ```sql
  UPDATE offices SET name = 'Офис Пловдив 2' WHERE id = '4b7c8fcb-97b4-4d3f-9170-e6e5480f8030';
  ```
- [ ] Empty tables (`realtors`, `deals`, `training_progress`) — left empty by design for now.

## Phase 2 — Medium (partial)
- [x] Smoke test step added to CI
- [x] Password reset link on login page
- [ ] Split large files (`AccountManagementPage.tsx`, `supabaseApi.ts`) — deferred (high risk without full test suite)
- [ ] Server-side hierarchy filters — deferred (requires RLS + query changes)
- [ ] Role checks — UI checks remain; real enforcement is RLS (see Phase 1)

## Phase 3 — Low (notes)
- [ ] Clean conflicting RLS migrations — review in Supabase
- [ ] Root scripts (`create-admin.js`, etc.) — left in place; document before deleting
- [ ] List virtualization — optional polish
- [ ] Confirm indexes applied — check Supabase dashboard

## Manual steps still required
1. In Supabase SQL editor, rename the duplicate office (SQL above).
2. Review and tighten RLS policies so anon cannot read all profiles/roles.
3. After Vercel deploy finishes, verify login + “Забравена парола?” works.
