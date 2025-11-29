# 🔧 Manual PostgreSQL Fix

Since you can run `sudo -u postgres psql`, please run these commands in your terminal:

## Step 1: Set Password and Create Database

```bash
# Set the postgres user password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Create the database
sudo -u postgres psql -c "CREATE DATABASE xnvd;"

# Verify the database exists
sudo -u postgres psql -lqt | grep xnvd
```

## Step 2: Fix Authentication Method (if password auth still fails)

If password authentication still doesn't work, you need to update `pg_hba.conf`:

```bash
# Edit the PostgreSQL configuration
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Find the line that says:
# host    all             all             127.0.0.1/32            scram-sha-256
# or
# host    all             all             127.0.0.1/32            md5

# Make sure it says 'md5' or 'scram-sha-256' (not 'peer' or 'ident')

# Then reload PostgreSQL
sudo systemctl reload postgresql
```

## Step 3: Test Connection

```bash
# Test with password
PGPASSWORD=postgres psql -h localhost -U postgres -d xnvd -c "SELECT version();"
```

## Step 4: Run Migrations

Once authentication works:

```bash
cd /home/hades/Music/xnvd-main/server
npm run prisma:migrate
node scripts/create-admin.js
```

## Quick Script

Or run the quick fix script:

```bash
cd /home/hades/Music/xnvd-main
sudo bash fix-auth-now.sh
```

