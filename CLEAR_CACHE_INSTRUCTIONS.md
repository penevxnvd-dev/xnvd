# 🧹 Clear Supabase Cache - Complete Instructions

## Problem

You're seeing WebSocket errors to the old Supabase project (`ufpeftuanzmkiryohesd`). This is caused by **cached data** in your browser from the old project.

## Solution: Clear All Browser Cache

### Method 1: Use the Cache Clearing Tool (Easiest)

1. **Open the cache clearing tool:**
   - Open `clear-supabase-cache.html` in your browser
   - Or go to: `http://localhost:8080/clear-supabase-cache.html` (if running dev server)

2. **Click "Clear All Supabase Cache"**

3. **Hard refresh your app:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

### Method 2: Manual Browser Cache Clear

#### Firefox

1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select:
   - ✅ Cookies and Site Data
   - ✅ Cached Web Content
3. Time range: **Everything**
4. Click **Clear Now**

#### Chrome/Edge

1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
3. Time range: **All time**
4. Click **Clear data**

### Method 3: Developer Tools (Most Thorough)

1. **Open Developer Tools:**
   - Press `F12` or `Ctrl + Shift + I` (or `Cmd + Option + I` on Mac)

2. **Clear Application Storage:**
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Click **Clear site data** or **Clear All**
   - This clears:
     - localStorage
     - sessionStorage
     - IndexedDB
     - Cookies
     - Cache

3. **Or clear individually:**
   - **Local Storage** → Right-click → Clear
   - **Session Storage** → Right-click → Clear
   - **IndexedDB** → Delete all databases
   - **Cookies** → Delete all

4. **Hard refresh:**
   - `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

### Method 4: Clear Specific Supabase Keys

If you want to be more selective:

1. Open Developer Tools (`F12`)
2. Go to **Console** tab
3. Run these commands:

```javascript
// Clear all Supabase-related localStorage
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('ufpeftuanzmkiryohesd')) {
    localStorage.removeItem(key);
    console.log('Cleared:', key);
  }
});

// Clear all Supabase-related sessionStorage
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('ufpeftuanzmkiryohesd')) {
    sessionStorage.removeItem(key);
    console.log('Cleared:', key);
  }
});

// Clear IndexedDB
indexedDB.databases().then(databases => {
  databases.forEach(db => {
    if (db.name && (db.name.includes('supabase') || db.name.includes('realtime'))) {
      indexedDB.deleteDatabase(db.name);
      console.log('Deleted DB:', db.name);
    }
  });
});

// Reload page
location.reload();
```

## After Clearing Cache

1. **Close all tabs** with your app
2. **Restart browser** (optional but recommended)
3. **Open app again** - it should use the new project

## Verify It Worked

After clearing cache, check:

1. **Open Developer Tools** → **Console**
2. You should see: `✅ Supabase client configured with remote URL: https://qxompdwqdnemsntssjot.supabase.co`
3. **No WebSocket errors** to `ufpeftuanzmkiryohesd`
4. **App works normally**

## If Errors Persist

If you still see errors after clearing cache:

1. **Check .env file:**
   ```bash
   cat .env | grep SUPABASE
   ```
   Should show: `qxompdwqdnemsntssjot` (not `ufpeftuanzmkiryohesd`)

2. **Rebuild the app:**
   ```bash
   npm run build
   ```

3. **Clear browser cache again** (Method 2 or 3)

4. **Try incognito/private window:**
   - This uses a fresh session with no cache
   - If it works in incognito, it confirms cache issue

## Prevention

The app now:
- ✅ Disables Realtime completely (no WebSocket connections)
- ✅ Filters WebSocket errors (they won't show in console)
- ✅ Validates project URL (prevents old project usage)
- ✅ Uses local backup as primary data source (reduces Supabase calls)

## Quick Command

For fastest clearing, open browser console and run:

```javascript
localStorage.clear(); sessionStorage.clear(); indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name))); location.reload();
```

This clears everything and reloads the page.

