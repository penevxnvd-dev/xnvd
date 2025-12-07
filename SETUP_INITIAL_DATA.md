# 🚀 Setup Initial Data

## Overview

This guide will help you create the initial data structure for the XNVD app:
- Country: България
- Cities: Варна, София, Пловдив, Бургас
- Offices with addresses
- Accounts with proper roles

## Structure

### Regional Managers
- **Камен Георгиев** (kamen.georgiev@xnvd.com)
  - Regional manager for: Пловдив, Бургас
  - Can see offices in both cities

### Office Managers
- **Краси Кътев** (krasi.katev@xnvd.com)
  - Office manager for: Бургас office
  - Can see only offices in Бургас

### Team Leaders
- **Георги Пенев** (georgi.penev@xnvd.com)
  - Team leader: Екип Георги Пенев
  - Can see only their team

- **Лазар Бундев** (lazar.bundev@xnvd.com)
  - Team leader: Екип Лазар Бундев
  - Can see only their team

### Offices
- **Бургас**: ул. Хан Крум 6 (Manager: Краси Кътев)
- **Пловдив**: Мария Луиза 43
- **София**: Сребърна 14

## Setup Steps

### Option 1: Using SQL Scripts (Recommended)

1. **Create basic structure:**
   - Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new
   - Copy and paste: `supabase/migrations/create-initial-data.sql`
   - Click "Run"

2. **Create auth users:**
   - Option A: Use Supabase Auth Dashboard
     - Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users
     - Click "Add user" → "Create new user"
     - Create each user with their email and password
   
   - Option B: Use script (requires Service Role Key)
     ```bash
     # Add SUPABASE_SERVICE_ROLE_KEY to .env first
     node scripts/create-users-via-admin.js
     ```

3. **Complete setup:**
   - Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new
   - Copy and paste: `supabase/migrations/create-accounts-and-offices.sql`
   - Click "Run"

### Option 2: Using Node.js Script (Requires Service Role Key)

1. **Add Service Role Key to .env:**
   ```bash
   # Get from: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. **Run the script:**
   ```bash
   node scripts/create-initial-data.js
   ```

## Account Passwords

Default passwords (change after first login):
- kamen.georgiev@xnvd.com: `Kamen123!`
- krasi.katev@xnvd.com: `Krasi123!`
- georgi.penev@xnvd.com: `Georgi123!`
- lazar.bundev@xnvd.com: `Lazar123!`

## Verification

After setup, verify the data:

```bash
node scripts/check-supabase-connection.js
```

You should see:
- ✅ 4 profiles
- ✅ 4 user roles
- ✅ 1 country (България)
- ✅ 4 cities
- ✅ 3 offices
- ✅ 2 teams

## Permissions Summary

### Камен Георгиев (Regional Manager)
- Can see: Offices in Пловдив and Бургас
- Can see: Teams in Пловдив and Бургас
- Can see: Realtors in Пловдив and Бургас

### Краси Кътев (Office Manager)
- Can see: Only Бургас office
- Can see: Teams in Бургас office
- Can see: Realtors in Бургас office

### Георги Пенев & Лазар Бундев (Team Leaders)
- Can see: Only their own team
- Can see: Realtors in their team

