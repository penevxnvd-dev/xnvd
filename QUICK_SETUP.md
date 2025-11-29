# 🚀 Quick Database Setup

## ⚠️ Required: Run with sudo

I cannot run sudo commands automatically. Please run these commands in your terminal:

### Option 1: Use the setup script (Recommended)

```bash
cd /home/hades/Music/xnvd-main
sudo bash setup-database.sh
```

### Option 2: Manual setup

```bash
# 1. Start PostgreSQL
sudo systemctl start postgresql

# 2. Create database
sudo -u postgres psql -c "CREATE DATABASE xnvd;"

# 3. Initialize database schema (no sudo needed)
cd /home/hades/Music/xnvd-main/server
npm run prisma:migrate

# 4. Create admin account (no sudo needed)
node scripts/create-admin.js
```

## After Setup

Once PostgreSQL is running and the database is initialized:

- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001
- **Login**: http://localhost:8080/auth
  - Email: `admin@xnvd.com`
  - Password: `Admin123!`

## Verify Setup

Test the database connection:
```bash
cd /home/hades/Music/xnvd-main/server
npm run prisma:studio
```

This should open Prisma Studio if everything is working.


