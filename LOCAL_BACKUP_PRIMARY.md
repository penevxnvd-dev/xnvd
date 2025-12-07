# 📦 Local Backup as Primary Data Source

## Overview

The app now uses **local backup as the primary data source** for all read operations. Supabase is used only for:
- Writing/updating data
- Syncing data to local backup
- Authentication

## How It Works

### Data Flow

1. **App requests data** → Checks local backup first
2. **If backup has data** → Returns immediately (fast, offline-capable)
3. **If backup is empty/missing** → Falls back to Supabase
4. **After Supabase fetch** → Data is synced to backup for next time

### Benefits

- ✅ **Faster loading** - Local files are instant
- ✅ **Offline support** - Works without internet
- ✅ **Reduced Supabase load** - Fewer API calls
- ✅ **Better performance** - No network latency

## Synced Tables

All these tables are synced and available from local backup:

- ✅ `profiles` - User profiles
- ✅ `user_roles` - User roles
- ✅ `countries` - Countries
- ✅ `cities` - Cities
- ✅ `offices` - Offices
- ✅ `teams` - Teams
- ✅ `realtors` - Realtors
- ✅ `deals` - Deals
- ✅ `diagnoses` - Diagnoses
- ✅ `training_progress` - Training progress
- ✅ `realtor_goals` - Realtor goals
- ✅ `buyer_schedule` - Buyer schedules
- ✅ `messages` - Messages

## Methods Using Local Backup

These methods now use local backup first:

- `getCountries()` - All countries
- `getCitiesByCountry()` - Cities filtered by country
- `getAllOffices()` - All offices
- `getOfficesByCity()` - Offices filtered by city
- `getTeamsByOffice()` - Teams filtered by office
- `getRealtorsByTeam()` - Realtors filtered by team

## Sync Process

### Automatic Sync

Sync happens automatically:
- **Before backup** - When running `./backup-local.sh`
- **On app start** - Checks if sync is needed
- **Periodically** - Every hour (if backup is older than 24 hours)

### Manual Sync

To sync manually:
```bash
node sync-supabase-to-backup.js
```

This will:
1. Fetch all data from Supabase
2. Save to `local-backup/data/` (backup location)
3. Save to `public/local-backup/data/` (app access)
4. Create index and metadata files

## File Locations

### Backup Location (for backup system)
```
local-backup/
├── data/
│   ├── countries.json
│   ├── cities.json
│   ├── offices.json
│   ├── teams.json
│   ├── realtors.json
│   └── ...
└── metadata.json
```

### App Access Location (served by Vite)
```
public/local-backup/
├── data/
│   ├── countries.json
│   ├── cities.json
│   ├── offices.json
│   ├── teams.json
│   ├── realtors.json
│   └── ...
└── metadata.json
```

## Implementation Details

### Code Pattern

All read methods follow this pattern:

```typescript
async getData() {
  const result = await withLocalBackupFirst(
    'table_name',
    async () => {
      // Supabase call (fallback)
      const { data, error } = await supabase
        .from('table_name')
        .select('*');
      return { data, error };
    },
    (item) => {
      // Optional filter for cached data
      return item.someField === someValue;
    }
  );

  return result.data || [];
}
```

### Enrichment

When data comes from backup, related data (like profiles for realtors) is enriched from backup as well.

## Write Operations

Write operations (create, update, delete) still go directly to Supabase:
- They don't use local backup
- After write, sync should be run to update backup
- Or wait for automatic sync

## Troubleshooting

### Data Not Updating

If you see old data:
1. Run sync: `node sync-supabase-to-backup.js`
2. Hard refresh browser (Ctrl+Shift+R)
3. Check if backup files are recent

### Backup Not Found

If app can't find backup:
1. Check if files exist: `ls -la public/local-backup/data/`
2. Run sync to create files
3. Check browser console for errors

### Performance

- First load might be slower (if backup is empty)
- Subsequent loads are instant (from backup)
- Sync runs in background, doesn't block app

## Best Practices

1. **Regular Syncs** - Sync before important operations
2. **Check Backup Age** - Verify backup is recent
3. **Monitor Logs** - Watch for "Using local backup" messages
4. **Test Offline** - Verify app works without internet

## Migration Notes

- Old code using `withFallback` still works (backward compatible)
- New code should use `withLocalBackupFirst`
- All read methods are gradually being migrated

