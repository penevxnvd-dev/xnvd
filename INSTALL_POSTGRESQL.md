# 📦 Install PostgreSQL for XNVD

## Current Status
PostgreSQL server is **not installed** on your system. Only the client library is present.

## Installation Options

### Option 1: Install via apt (Recommended)

Run this command:
```bash
cd /home/hades/Music/xnvd-main
sudo bash install-postgresql.sh
```

This script will:
1. ✅ Update package list
2. ✅ Install PostgreSQL server and contrib packages
3. ✅ Start PostgreSQL service
4. ✅ Enable PostgreSQL to start on boot
5. ✅ Create the 'xnvd' database

### Option 2: Manual Installation

If you prefer to install manually:

```bash
# 1. Update package list
sudo apt-get update

# 2. Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# 3. Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. Create database
sudo -u postgres psql -c "CREATE DATABASE xnvd;"
```

### Option 3: Docker (Alternative)

If you prefer using Docker:

```bash
# Run PostgreSQL in Docker
docker run --name xnvd-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=xnvd \
  -p 5432:5432 \
  -d postgres:16

# Update DATABASE_URL in server/.env if needed
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xnvd?schema=public"
```

## After Installation

Once PostgreSQL is installed and running, complete the setup:

```bash
cd /home/hades/Music/xnvd-main/server

# Run migrations
npm run prisma:migrate

# Create admin account
node scripts/create-admin.js
```

## Verify Installation

Test that PostgreSQL is working:
```bash
# Check service status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d xnvd -c "SELECT version();"
```

## Troubleshooting

If you encounter issues:

1. **Service won't start**: Check logs with `sudo journalctl -u postgresql -n 50`
2. **Permission denied**: Make sure you're using `sudo` for system commands
3. **Port already in use**: Check if PostgreSQL is already running: `sudo netstat -tlnp | grep 5432`

