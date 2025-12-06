# Vercel Environment Variables Setup

## Problem
The app requires Supabase environment variables to work. If they're not set in Vercel, the app will fail to load.

## Required Environment Variables

You need to add these in Vercel Dashboard:

1. **VITE_SUPABASE_URL** - Your Supabase project URL
2. **VITE_SUPABASE_PUBLISHABLE_KEY** - Your Supabase publishable/anon key

## How to Set Them Up

### Option A: Quick Setup (if you have .env file)

If you have a `.env` file with the variables, you can use the automated script:

```bash
# Make sure you're logged in to Vercel
vercel login

# Run the script
./add-env-to-vercel.sh
```

This will automatically read your `.env` file and add the variables to Vercel.

### Option B: Manual Setup

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep
2. Click on **Settings** → **API**
3. Find:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **anon/public key** → This is your `VITE_SUPABASE_PUBLISHABLE_KEY`

### Step 2: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **xnvd**
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

   **Variable 2:**
   - Name: `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Value: Your Supabase anon/public key (starts with `eyJ...`)
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

### Step 3: Redeploy

After adding the environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or make a new commit and push to trigger a new deployment

## Verify

After redeployment, check:
- The app should load without errors
- You should be able to log in
- No console errors about missing environment variables

## GitHub Secrets (for CI/CD)

These are also needed in GitHub Secrets for the CI/CD pipeline:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Add them at: https://github.com/penevxnvd-dev/xnvd/settings/secrets/actions

## Troubleshooting

**Error: "Missing or invalid environment variables"**
- Make sure both variables are set in Vercel
- Make sure they're set for the correct environment (Production/Preview)
- Redeploy after adding variables

**Error: "Cannot use local Supabase"**
- Make sure `VITE_SUPABASE_URL` points to your remote Supabase (not localhost)
- Should be like: `https://xxxxx.supabase.co`

