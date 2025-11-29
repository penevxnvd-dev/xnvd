# 🔐 Fix PostgreSQL Password Issue

## Problem
PostgreSQL is running but the password authentication is failing. The default password "postgres" doesn't work.

## Solution

Run this script to set the password and create the database:

```bash
cd /home/hades/Music/xnvd-main
sudo bash setup-postgres-password.sh
```

This will:
1. Set the postgres user password to "postgres"
2. Create the "xnvd" database
3. Verify everything is set up correctly

## After Running the Script

Once the script completes successfully, run:

```bash
cd /home/hades/Music/xnvd-main/server

# Run migrations
npm run prisma:migrate

# Create admin account
node scripts/create-admin.js
```

## Alternative: Manual Setup

If you prefer to do it manually:

```bash
# 1. Set password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# 2. Create database
sudo -u postgres psql -c "CREATE DATABASE xnvd;"

# 3. Verify
sudo -u postgres psql -lqt | grep xnvd
```

## Test Connection

After setting the password, test the connection:

```bash
cd /home/hades/Music/xnvd-main/server
PGPASSWORD=postgres psql -h localhost -U postgres -d xnvd -c "SELECT version();"
```

