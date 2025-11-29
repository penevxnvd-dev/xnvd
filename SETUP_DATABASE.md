# 🗄️ Database Setup Instructions

## Current Status
- ✅ Frontend: Running on http://localhost:8080
- ✅ Backend: Running on http://localhost:3001
- ❌ PostgreSQL: Not running - **Action Required**

## Steps to Complete Setup

### 1. Start PostgreSQL

```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Verify it's running
sudo systemctl status postgresql
```

### 2. Create Database

```bash
# Create the database
sudo -u postgres psql -c "CREATE DATABASE xnvd;"
```

### 3. Initialize Database Schema

```bash
cd /home/hades/Music/xnvd-main/server

# Run Prisma migrations
npm run prisma:migrate

# Create admin account
node scripts/create-admin.js
```

### 4. Verify Everything Works

```bash
# Test backend health
curl http://localhost:3001/api/health

# Test database connection
cd /home/hades/Music/xnvd-main/server
npm run prisma:studio  # Opens Prisma Studio to view database
```

## Admin Account

After running `create-admin.js`:
- **Email:** `admin@xnvd.com`
- **Password:** `Admin123!`
- **Login URL:** http://localhost:8080/auth

## Alternative: If PostgreSQL is not installed

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Enable on boot

# Then follow steps 2-4 above
```

