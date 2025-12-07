# 🔍 Debugging 403 Forbidden Errors

## What is a 403 Error?

A `403 Forbidden` error means the server understood your request but is refusing to fulfill it. In Supabase, this usually indicates:

1. **RLS (Row Level Security) Policy Violation**: Your user doesn't have permission to access the resource
2. **Authentication Issue**: You're not properly authenticated
3. **Missing Role**: Your user doesn't have the required role in `user_roles` table

## Common Causes

### 1. User Not Authenticated

**Symptom**: 403 errors on all API calls

**Solution**:
- Make sure you're logged in
- Check if session exists: Open browser console and run:
  ```javascript
  const { data: { user } } = await supabase.auth.getUser();
  console.log('User:', user);
  ```
- If `user` is `null`, you need to log in again

### 2. Missing User Role

**Symptom**: 403 errors on role-specific operations (e.g., admin operations)

**Solution**:
- Check if user has role in `user_roles` table:
  ```sql
  SELECT * FROM user_roles WHERE user_id = 'your-user-id';
  ```
- Add role if missing:
  ```sql
  INSERT INTO user_roles (user_id, role)
  VALUES ('your-user-id', 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  ```

### 3. RLS Policy Too Restrictive

**Symptom**: 403 errors on specific tables/operations

**Solution**:
- Check RLS policies in Supabase Dashboard:
  1. Go to Authentication → Policies
  2. Find the table causing issues
  3. Review policies and ensure they allow your user's role

### 4. Session Expired

**Symptom**: 403 errors after being idle for a while

**Solution**:
- Log out and log back in
- Supabase should auto-refresh tokens, but sometimes manual refresh is needed

## Debugging Steps

### Step 1: Check Authentication

```javascript
// In browser console
const { data: { user }, error } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Error:', error);
```

### Step 2: Check User Role

```javascript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  console.log('User roles:', roles);
}
```

### Step 3: Check RLS Policies

1. Go to Supabase Dashboard
2. Navigate to Authentication → Policies
3. Find the table causing 403 errors
4. Review policies:
   - Should allow `authenticated` users to SELECT
   - Should check for specific roles if needed

### Step 4: Test API Call Directly

```javascript
// In browser console
const { data, error } = await supabase
  .from('countries')  // Replace with your table
  .select('*');

console.log('Data:', data);
console.log('Error:', error);
```

## Quick Fixes

### Fix 1: Re-authenticate

```javascript
// Log out and log back in
await supabase.auth.signOut();
// Then log in again through the app
```

### Fix 2: Add Admin Role

If you need admin access:

```sql
-- Replace 'your-user-id' with actual user ID from auth.users
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Fix 3: Check RLS Policies

Ensure policies allow authenticated users:

```sql
-- Example: Allow all authenticated users to view countries
CREATE POLICY "Authenticated users can view countries"
ON public.countries
FOR SELECT
TO authenticated
USING (true);
```

## Error Messages

The app now provides better error messages:

- **"Access denied. You may not be authenticated..."** → Log in again
- **"Access denied. You do not have permission..."** → Check user role
- **"Not authenticated. Please log in."** → Session expired, log in again

## Still Having Issues?

1. Check browser console for detailed error messages
2. Check Supabase Dashboard → Logs for server-side errors
3. Verify environment variables are set correctly
4. Check network tab in browser DevTools for the exact request/response

---

**Note**: In development mode, 403 errors are logged to console with warnings to help debugging.

