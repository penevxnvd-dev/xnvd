# Vercel Token Setup for CI/CD

## Problem
The CI/CD pipeline is failing with:
```
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

This happens because the `VERCEL_TOKEN` GitHub secret is not configured.

## Solution

### Step 1: Get Your Vercel Token

**If you already created a token named "github":**
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Find your token named "github"
3. **⚠️ Important:** If you can't see the token value, you'll need to create a new one (tokens are only shown once when created)
4. If you still have the token value, copy it

**If you need to create a new token:**
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Give it a name (e.g., "GitHub Actions CI/CD" or "github")
4. Set expiration (or leave as "No expiration")
5. Click **"Create"**
6. **Copy the token immediately** (you won't be able to see it again!)

### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/penevxnvd-dev/xnvd`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `VERCEL_TOKEN`
5. Value: Paste the token you copied from Step 1
6. Click **"Add secret"**

### Step 3: Verify

After adding the secret, the next push to `main` branch should:
- ✅ Pass the test and lint job
- ✅ Successfully deploy to Vercel

## Alternative: Skip Vercel Deployment in CI/CD

If you don't want to deploy via CI/CD, you can:

1. Remove or comment out the `deploy` job in `.github/workflows/ci-cd.yml`
2. Deploy manually using: `vercel --prod`

Or modify the workflow to only run tests:

```yaml
jobs:
  test:
    name: Test and Lint
    runs-on: ubuntu-latest
    # ... test steps only
  # deploy job removed
```

## Current Workflow

The workflow currently:
1. Runs tests and linting on every push/PR
2. Deploys to Vercel production only when pushing to `main` branch
3. Requires `VERCEL_TOKEN` secret to be set

## Required GitHub Secrets

Make sure these are set in your repository:
- `VERCEL_TOKEN` - Your Vercel API token
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key

