# 🔄 Sync and Backup System

This project includes an automated system that:
1. **Syncs Supabase data to local backup** - Keeps local copies of all data
2. **Falls back to local backup** - App uses local backup when Supabase is unavailable

## How It Works

### 1. Data Synchronization

The `sync-supabase-to-backup.js` script:
- Fetches all data from Supabase tables
- Saves it to `local-backup/data/` (for backup system)
- Also saves to `public/local-backup/data/` (for app access)
- Creates index and metadata files

**Tables synced:**
- profiles
- user_roles
- countries
- cities
- offices
- teams
- realtors
- deals
- diagnoses
- training_progress
- realtor_goals
- buyer_schedule
- messages

### 2. Automatic Fallback

The app automatically:
- Tries Supabase first for all data requests
- Falls back to local backup if Supabase fails
- Logs when using backup data (for debugging)

**Methods with fallback:**
- `getCountries()`
- `getCitiesByCountry()`
- `getAllOffices()`
- (More methods can be added)

### 3. Automatic Syncing

- **Before backup** - Syncs data before creating backup
- **On app start** - Checks if sync is needed
- **Periodically** - Checks every hour if sync is needed

## Usage

### Manual Sync

Sync Supabase data to local backup:
```bash
node sync-supabase-to-backup.js
```

This will:
1. Fetch all data from Supabase
2. Save to `local-backup/data/` (backup location)
3. Save to `public/local-backup/data/` (app access)
4. Create index and metadata files

### Automatic Sync

The sync happens automatically:
- **Before backup** - When running `./backup-local.sh`
- **On app start** - App checks if sync is needed
- **Periodically** - Every hour (if backup is older than 24 hours)

### Viewing Backup Data

```bash
# View all synced tables
ls -lh public/local-backup/data/

# View specific table
cat public/local-backup/data/countries.json

# View metadata
cat public/local-backup/metadata.json

# View index
cat public/local-backup/data/index.json
```

## File Structure

```
project/
├── local-backup/              # Backup location (not in git)
│   ├── data/
│   │   ├── countries.json
│   │   ├── cities.json
│   │   ├── ...
│   │   └── index.json
│   └── metadata.json
├── public/
│   └── local-backup/          # App-accessible location
│       ├── data/
│       │   ├── countries.json
│       │   ├── cities.json
│       │   ├── ...
│       │   └── index.json
│       └── metadata.json
└── sync-supabase-to-backup.js
```

## How Fallback Works

### In Code

```typescript
// Example: getCountries() with fallback
const result = await withFallback(
  async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('*');
    return { data, error };
  },
  'countries'
);

// Result includes:
// - data: The data (from Supabase or backup)
// - error: Any error (null if backup was used)
// - fromCache: true if backup was used
```

### In App

The app automatically:
1. Tries Supabase
2. If Supabase fails → tries local backup
3. Logs when using backup
4. Returns data from whichever source worked

## Benefits

1. **Offline Support** - App works even when Supabase is down
2. **Faster Loading** - Local backup is faster than network
3. **Data Safety** - Local copies protect against data loss
4. **Automatic** - No manual intervention needed

## Configuration

### Sync Interval

Default: Checks every hour if sync is needed
- Syncs if backup is older than 24 hours

To change, edit `src/lib/syncService.ts`:
```typescript
private readonly SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour
```

### Backup Location

Backup data is stored in:
- `local-backup/` - For backup system
- `public/local-backup/` - For app access

Both are synced together automatically.

## Troubleshooting

### Backup Not Available

If app can't find backup:
1. Run sync manually: `node sync-supabase-to-backup.js`
2. Check if files exist: `ls -la public/local-backup/data/`
3. Check browser console for errors

### Sync Fails

If sync fails:
1. Check Supabase credentials in `.env`
2. Check network connection
3. Check Supabase project is accessible
4. Review error messages in console

### App Not Using Backup

If app doesn't fallback:
1. Check if backup files exist
2. Check browser console for errors
3. Verify `localBackup.ts` is imported correctly
4. Check network tab for failed requests

## Best Practices

1. **Regular Syncs** - Run sync before important operations
2. **Check Backup** - Verify backup is recent before relying on it
3. **Monitor Logs** - Watch for "Using local backup" messages
4. **Test Offline** - Test app with Supabase disabled to verify fallback

## Integration with Backup System

The sync is integrated with the backup system:
- Sync runs automatically before backup
- Backup includes synced data
- Both systems work together seamlessly

See `BACKUP_README.md` for more on the backup system.

