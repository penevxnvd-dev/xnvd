# 🧪 Manual Testing Guide for All Account Types

## Account Types to Test

The system supports 5 account types:
1. **admin** - Full system access
2. **realtor** - Individual realtor dashboard
3. **team_leader** - Team leader dashboard
4. **office_manager** - Office manager dashboard
5. **regional_manager** - Regional manager dashboard

## Current Accounts in Database

Based on the database query, here are the accounts that exist:

### Team Leaders
- **georgi.penev@xnvd.com** (Георги Пенев)
- **lazar.bundev@xnvd.com** (Лазар Бундев)

### Office Manager
- **krasi.katev@xnvd.com** (Краси Кътев)

### Regional Manager
- **kamen.georgiev@xnvd.com** (Камен Георгиев)

## Testing Steps

### 1. Start the Application

```bash
npm run dev
```

The app should start at `http://localhost:5174`

### 2. Test Each Account Type

For each account type, follow these steps:

#### Step 1: Login
1. Go to `/auth` page
2. Enter email and password
3. Click "Влез" (Login)
4. Verify successful login

#### Step 2: Verify Dashboard Routing
1. After login, you should be redirected to `/dashboard`
2. Verify the correct dashboard component loads:
   - **admin** → `AdminDashboard`
   - **realtor** → `RealtorDashboard`
   - **team_leader** → `TeamLeaderDashboard`
   - **office_manager** → `OfficeManagerDashboard`
   - **regional_manager** → `RegionalManagerDashboard`

#### Step 3: Verify Dashboard Content
1. Check that dashboard-specific features are visible
2. Verify data loads correctly
3. Check for any console errors
4. Verify navigation works

#### Step 4: Test Logout
1. Click logout button
2. Verify redirect to `/auth`
3. Verify session is cleared

## Test Checklist

### Admin Account
- [ ] Can login with admin credentials
- [ ] Redirects to AdminDashboard
- [ ] Can see admin-specific features
- [ ] Can manage users
- [ ] Can view all data
- [ ] Logout works

### Realtor Account
- [ ] Can login with realtor credentials
- [ ] Redirects to RealtorDashboard
- [ ] Can see realtor-specific features
- [ ] Can view own deals
- [ ] Can view training progress
- [ ] Logout works

### Team Leader Account
- [ ] Can login with team_leader credentials (georgi.penev@xnvd.com or lazar.bundev@xnvd.com)
- [ ] Redirects to TeamLeaderDashboard
- [ ] Can see team-specific features
- [ ] Can view team members
- [ ] Can view team KPIs
- [ ] Logout works

### Office Manager Account
- [ ] Can login with office_manager credentials (krasi.katev@xnvd.com)
- [ ] Redirects to OfficeManagerDashboard
- [ ] Can see office-specific features
- [ ] Can view office teams
- [ ] Can view office KPIs
- [ ] Logout works

### Regional Manager Account
- [ ] Can login with regional_manager credentials (kamen.georgiev@xnvd.com)
- [ ] Redirects to RegionalManagerDashboard
- [ ] Can see regional-specific features
- [ ] Can view cities/offices
- [ ] Can view regional KPIs
- [ ] Logout works

## Common Issues to Check

1. **Authentication Errors**
   - Check if email is confirmed in Supabase
   - Verify password is correct
   - Check browser console for errors

2. **Role Assignment**
   - Verify role exists in `user_roles` table
   - Check `useUserRole` hook returns correct role
   - Verify Dashboard routing logic

3. **RLS Policy Errors**
   - Check if user has permission to access data
   - Verify RLS policies in Supabase
   - Check browser console for 403 errors

4. **Dashboard Loading**
   - Check if dashboard component exists
   - Verify imports are correct
   - Check for TypeScript errors

## Quick Test Commands

```bash
# Check if all dashboard components exist
ls -la src/pages/*/Dashboard.tsx
ls -la src/pages/admin/AdminDashboard.tsx
ls -la src/pages/realtor/RealtorDashboard.tsx
ls -la src/pages/team-leader/TeamLeaderDashboard.tsx
ls -la src/pages/office-manager/OfficeManagerDashboard.tsx
ls -la src/pages/regional-manager/RegionalManagerDashboard.tsx

# Run linting
npm run lint

# Run type check
npx tsc --noEmit

# Build for production
npm run build
```

## Notes

- If an account doesn't exist, you may need to create it first
- Passwords are stored in Supabase Auth (not in plain text)
- Make sure email confirmation is enabled for new accounts
- Check Supabase Dashboard → Authentication → Users for account status

