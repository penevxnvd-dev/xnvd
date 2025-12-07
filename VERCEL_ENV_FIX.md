# 🔧 Fix Vercel Environment Variables

## Problem

You're seeing: `Error: Old Supabase project URL detected. Please update environment variables.`

This means Vercel is still using the old Supabase project URL (`ufpeftuanzmkiryohesd`) instead of the new one (`qxompdwqdnemsntssjot`).

## Solution

### Step 1: Update Environment Variables in Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select project: **xnvd**

2. **Go to Settings → Environment Variables**

3. **Find `VITE_SUPABASE_URL` and update it:**
   - ❌ Old (wrong): `https://ufpeftuanzmkiryohesd.supabase.co`
   - ✅ New (correct): `https://qxompdwqdnemsntssjot.supabase.co`

4. **Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is correct:**
   - Should be the key for project `qxompdwqdnemsntssjot`

5. **Make sure both variables are set for:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. **Click Save**

### Step 2: Force Redeploy

**Important:** After updating environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋯** (three dots)
4. Click **Redeploy**
5. **Important:** Make sure "Use existing Build Cache" is **UNCHECKED**
6. Click **Redeploy**

This ensures the new environment variables are picked up.

### Step 3: Verify

After redeployment completes:

1. Open: https://xnvd.vercel.app
2. Open browser console (`F12` → Console)
3. You should see:
   ```
   ✅ Supabase client configured with remote URL: https://qxompdwqdnemsntssjot.supabase.co
   ```
4. You should NOT see:
   - ❌ "Old Supabase project" errors
   - ❌ WebSocket errors to `ufpeftuanzmkiryohesd`

## Quick Check

To verify your environment variables are correct:

1. In Vercel Dashboard → Settings → Environment Variables
2. Check `VITE_SUPABASE_URL` value
3. It should contain: `qxompdwqdnemsntssjot`
4. It should NOT contain: `ufpeftuanzmkiryohesd`

## If Still Not Working

1. **Delete and recreate the variable:**
   - Delete `VITE_SUPABASE_URL`
   - Add it again with the correct value
   - Save
   - Redeploy (without cache)

2. **Check all environments:**
   - Make sure the variable is set for Production, Preview, AND Development

3. **Clear Vercel build cache:**
   - When redeploying, uncheck "Use existing Build Cache"
   - Or delete the deployment and push a new commit

4. **Verify in deployment logs:**
   - Check the deployment logs in Vercel
   - Look for environment variable values (they might be masked, but you can see if they're being used)

## Current Correct Values

```env
VITE_SUPABASE_URL=https://qxompdwqdnemsntssjot.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b21wZHdxZG5lbXNudHNzam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODYzNzcsImV4cCI6MjA4MDA2MjM3N30.J2xIe0lipsAkMi2AgkJuz0G9L1F2w7I8JWiwiOxQQHY
```

## Note

The app now handles this error gracefully (won't crash), but you should still fix the environment variables for proper functionality.

