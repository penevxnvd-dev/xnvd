# 🔧 Vercel Deployment Troubleshooting

## Current Issue: "Provisioning Integration Failed"

This error occurs when Vercel fails to provision integrations or environment variables during deployment.

## Environment Variables Setup

The application requires these environment variables in Vercel:

1. **VITE_SUPABASE_URL**: `https://qxompdwqdnemsntssjot.supabase.co`
2. **VITE_SUPABASE_PUBLISHABLE_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b21wZHdxZG5lbXNudHNzam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODYzNzcsImV4cCI6MjA4MDA2MjM3N30.J2xIe0lipsAkMi2AgkJuz0G9L1F2w7I8JWiwiOxQQHY`

## Setup Steps in Vercel Dashboard

1. Go to: https://vercel.com/penevxnvd-devs-projects/xnvd/settings/environment-variables

2. For each variable, add to all environments:
   - Production
   - Preview
   - Development

3. Verify the variables are set correctly

## Deployment Command

```bash
vercel deploy --prod --token "TIySKI61Vd2yme9Z5BERqjH4"
```

## Common Issues

### Issue 1: Environment Variables Not Set
**Symptom**: Build fails with "provisioning integration failed"  
**Solution**: Ensure all environment variables are added to all environments in Vercel Dashboard

### Issue 2: Build Command Not Found
**Symptom**: Build shows `[0ms]` duration  
**Solution**: Vercel should auto-detect Vite. If not, verify `package.json` has the build script

### Issue 3: Node Version Mismatch
**Symptom**: Build errors related to Node.js  
**Solution**: `.nvmrc` file is set to `22`, and `package.json` specifies `>=18.0.0`

## Current Configuration

- **Framework**: Vite (auto-detected)
- **Build Command**: `npm run build` (from package.json)
- **Output Directory**: `dist`
- **Node Version**: 22 (from .nvmrc)

## Check Deployment Status

```bash
vercel ls --token "TIySKI61Vd2yme9Z5BERqjH4"
```

## Inspect Specific Deployment

```bash
vercel inspect <deployment-url> --token "TIySKI61Vd2yme9Z5BERqjH4"
```

## Manual Steps to Fix

1. **Check Environment Variables in Dashboard**:
   - Go to project settings → Environment Variables
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` exist
   - Ensure they're enabled for Production, Preview, and Development

2. **Redeploy from Dashboard**:
   - Go to Deployments tab
   - Find the latest deployment
   - Click "Redeploy" (⋯ menu → Redeploy)

3. **Check Build Logs**:
   - Open the failed deployment
   - View "Build Logs" tab
   - Look for specific error messages

## Contact

If the issue persists:
1. Check Vercel status: https://www.vercel-status.com/
2. Check Supabase status: https://status.supabase.com/
3. Review deployment logs in Vercel Dashboard
