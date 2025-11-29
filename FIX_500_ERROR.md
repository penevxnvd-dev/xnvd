# 🔧 Fix 500 Error on Login

## Problem
The `/api/auth/login` endpoint returns a 500 Internal Server Error because PostgreSQL database is not running.

## Error Details
```
Can't reach database server at `localhost:5432`
```

## Solution

### Step 1: Start PostgreSQL

Run this command in your terminal:
```bash
sudo systemctl start postgresql
```

### Step 2: Verify PostgreSQL is Running

```bash
sudo systemctl status postgresql
```

You should see `active (running)` in green.

### Step 3: Create Database (if not exists)

```bash
sudo -u postgres psql -c "CREATE DATABASE xnvd;"
```

### Step 4: Initialize Database Schema

```bash
cd /home/hades/Music/xnvd-main/server
npm run prisma:migrate
```

### Step 5: Create Admin Account

```bash
cd /home/hades/Music/xnvd-main/server
node scripts/create-admin.js
```

### Step 6: Test Login

After completing the above steps, try logging in again:
- URL: http://localhost:8080/auth
- Email: `admin@xnvd.com`
- Password: `Admin123!`

## Alternative: If PostgreSQL is Not Installed

If PostgreSQL is not installed on your system:

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Enable on boot

# Then follow steps 3-6 above
```

## Quick Check

After starting PostgreSQL, verify the connection:
```bash
cd /home/hades/Music/xnvd-main/server
npm run prisma:studio
```

This should open Prisma Studio if the database connection is working.

