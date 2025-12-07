# Fix Vercel Root Directory Error

## Problem
Vercel build is failing with:
```
The specified Root Directory "xnvdpenev-dev/xnvd" does not exist.
```

## Solution

The Root Directory setting in Vercel is incorrect. It should be **empty** (root of repository), not `xnvdpenev-dev/xnvd`.

### Steps to Fix:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select project: **xnvd**

2. **Go to Settings:**
   - Click **Settings** tab
   - Scroll down to **General** section

3. **Fix Root Directory:**
   - Find **Root Directory** setting
   - **Clear the field** (make it empty)
   - Or set it to: `.` (dot means current directory/root)
   - Click **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

## Why This Happens

The Root Directory should be empty because:
- Your `package.json` is at the root: `/package.json`
- Your `vercel.json` is at the root: `/vercel.json`
- Your `src/` folder is at the root: `/src/`
- Your build command runs from root: `npm run build`

If Root Directory is set incorrectly, Vercel looks for files in the wrong location.

## Verify

After fixing, the build should:
- ✅ Find `package.json` at root
- ✅ Find `vercel.json` at root
- ✅ Run `npm run build` successfully
- ✅ Output to `dist/` directory

