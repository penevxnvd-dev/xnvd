# 📦 Local Backup System

This project includes an automated local backup system that backs up important data before commits and pushes.

## How It Works

### Automatic Backups

The backup system automatically runs:
- **Before commits** - via `.git/hooks/pre-commit`
- **Before pushes** - integrated into existing pre-push hook
- **Manually** - run `./backup-local.sh` anytime

### What Gets Backed Up

1. **Accounts Data**
   - `accounts-export.json`
   - `accounts-export.csv`
   - `accounts-export.md`
   - `ACCOUNTS_EXTRACTED.md`

2. **Configuration Files**
   - `.env` (if accessible)
   - `.env.example`
   - `supabase/config.toml`
   - `package.json`
   - `vite.config.ts`
   - `tsconfig.json`

3. **Documentation**
   - `README.md`
   - Important markdown files

### Backup Location

Backups are stored in: `~/.xnvd-backups/`

Structure:
```
~/.xnvd-backups/
├── backup_20251206_120000/
│   ├── accounts-export.json
│   ├── accounts-export.csv
│   ├── .env
│   ├── package.json
│   └── BACKUP_MANIFEST.txt
├── backup_20251206_130000/
│   └── ...
└── latest -> backup_20251206_130000
```

## Usage

### Manual Backup

Run the backup script manually:
```bash
./backup-local.sh
```

### View Backups

```bash
# List all backups
ls -lh ~/.xnvd-backups/

# View latest backup
ls -lh ~/.xnvd-backups/latest/

# View backup manifest
cat ~/.xnvd-backups/latest/BACKUP_MANIFEST.txt
```

### Restore from Backup

```bash
# Copy files from latest backup
cp ~/.xnvd-backups/latest/accounts-export.json ./

# Or from specific backup
cp ~/.xnvd-backups/backup_20251206_120000/accounts-export.json ./
```

## Backup Retention

- **Keeps last 10 backups** automatically
- Older backups are automatically cleaned up
- Each backup is timestamped: `backup_YYYYMMDD_HHMMSS`

## Backup Manifest

Each backup includes a `BACKUP_MANIFEST.txt` file with:
- Creation timestamp
- List of backed up files
- System information
- Git commit hash (if available)

## Disabling Automatic Backups

If you need to disable automatic backups:

1. **Remove pre-commit hook:**
   ```bash
   rm .git/hooks/pre-commit
   ```

2. **Remove from pre-push hook:**
   Edit `.git/hooks/pre-push` and remove the backup call

## Best Practices

1. **Regular Backups**: The system backs up automatically, but you can run manual backups anytime
2. **Check Backups**: Periodically verify backups are being created
3. **Backup Location**: The backup directory is in your home folder, so it persists across project changes
4. **Version Control**: Backups are NOT committed to git (they're in `~/.xnvd-backups/`)

## Troubleshooting

### Backup Fails

If backup fails:
1. Check permissions: `chmod +x backup-local.sh`
2. Check backup directory: `mkdir -p ~/.xnvd-backups`
3. Check disk space: `df -h ~`

### Missing Files in Backup

Some files might not be backed up if:
- They don't exist
- They're not readable
- They're in `.gitignore` (like `.env`)

The script will warn you about missing files but continue with the backup.

## Example Output

```
📦 Starting Local Backup...

📊 Backing up accounts data...
✅ Accounts JSON backed up
✅ Accounts CSV backed up
✅ Accounts Markdown backed up

🔐 Backing up environment configuration...
✅ Environment variables backed up

⚙️  Backing up configuration files...
✅ Supabase config backed up
✅ Package configuration backed up

📝 Creating backup manifest...
✅ Manifest created

✅ Local Backup Complete!

Backup Location: /home/user/.xnvd-backups/backup_20251206_120000
Latest Backup: /home/user/.xnvd-backups/latest
Total Backups: 5
```

