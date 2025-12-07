# 🔗 Supabase Connection Setup

## ✅ Connected to Supabase Project

**Project URL**: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot

**Project Reference**: `qxompdwqdnemsntssjot`

## 📋 Configuration

### Environment Variables

The app is configured to use these Supabase credentials:

```env
VITE_SUPABASE_URL=https://qxompdwqdnemsntssjot.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b21wZHdxZG5lbXNudHNzam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODYzNzcsImV4cCI6MjA4MDA2MjM3N30.J2xIe0lipsAkMi2AgkJuz0G9L1F2w7I8JWiwiOxQQHY
```

### Local Development

For local development, create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Or create manually with the values above
```

### Vercel Production

For production deployment on Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project **xnvd**
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `VITE_SUPABASE_URL` = `https://qxompdwqdnemsntssjot.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b21wZHdxZG5lbXNudHNzam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODYzNzcsImV4cCI6MjA4MDA2MjM3N30.J2xIe0lipsAkMi2AgkJuz0G9L1F2w7I8JWiwiOxQQHY`
5. Select environments: **Production**, **Preview**, **Development**
6. Save and redeploy

## 🔍 Verify Connection

### Test in Browser Console

```javascript
// Check if Supabase client is initialized
import { supabase } from '@/integrations/supabase/client';
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Test a simple query
const { data, error } = await supabase.from('profiles').select('count');
console.log('Connection test:', error ? 'Failed' : 'Success');
```

### Check Database Tables

The app uses these Supabase tables:
- `profiles` - User profiles
- `user_roles` - User roles and permissions
- `countries` - Countries
- `cities` - Cities
- `offices` - Offices
- `teams` - Teams
- `realtors` - Realtors
- `deals` - Deals
- `diagnoses` - Diagnoses
- `training_progress` - Training progress
- `messages` - Messages

## 🔐 Authentication

The app uses Supabase Auth for authentication:
- **Login**: `supabase.auth.signInWithPassword()`
- **Register**: `supabase.auth.signUp()`
- **Session**: Automatically managed by Supabase client
- **RLS**: Row Level Security policies are enabled

## 📊 Dashboard Access

Access your Supabase project dashboard:
- **URL**: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot
- **Settings**: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api
- **Database**: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/editor
- **Auth**: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users

## 🛠️ Troubleshooting

### Connection Issues

1. **Check environment variables**:
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_PUBLISHABLE_KEY
   ```

2. **Verify in browser console**:
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   ```

3. **Test connection**:
   ```javascript
   const { data, error } = await supabase.from('profiles').select('count');
   console.log('Error:', error);
   ```

### 403 Errors

See `DEBUG_403_ERRORS.md` for detailed troubleshooting.

### Authentication Issues

- Ensure user is logged in
- Check if session exists: `await supabase.auth.getUser()`
- Verify RLS policies allow access

---

**Status**: ✅ **Connected to Supabase Project**

Last Updated: $(date)

