# 📊 Supabase Project Data Report

**Project URL:** https://qxompdwqdnemsntssjot.supabase.co  
**Dashboard:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot  
**Generated:** 2025-12-06

---

## 📋 Database Overview

### Table Counts

| Table | Count | RLS Enabled |
|-------|-------|-------------|
| **countries** | 1 | ✅ |
| **cities** | 2 | ✅ |
| **offices** | 1 | ✅ |
| **teams** | 2 | ✅ |
| **realtors** | 0 | ✅ |
| **profiles** | 4 | ✅ |
| **user_roles** | 4 | ✅ |
| **deals** | 0 | ✅ |
| **diagnoses** | 0 | ✅ |
| **training_progress** | 0 | ✅ |
| **realtor_goals** | 0 | ✅ |
| **buyer_schedule** | 0 | ✅ |
| **messages** | 0 | ✅ |

---

## 🌍 Organizational Structure

### Country: България (BG)

- **Cities:** 2
- **Offices:** 1
- **Teams:** 2
- **Realtors:** 0

#### Cities:
1. **Бургас**
2. **Пловдив**

#### Offices:
1. **Офис Бургас** (Бургас)

#### Teams:
1. **Георги Пенев** (Офис Бургас, Бургас)
   - Leader: Георги Пенев (georgi.penev@xnvd.com)
   - Realtors: 0

2. **Лазар Бундев** (Офис Бургас, Бургас)
   - Leader: Лазар Бундев (lazar.bundev@xnvd.com)
   - Realtors: 0

---

## 👥 User Accounts & Roles

### Manager Accounts

| Name | Email | Role | Managed Entity |
|------|-------|------|----------------|
| **Краси Кътев** | krasi.katev@xnvd.com | `office_manager` | Офис Бургас |
| **Лазар Бундев** | lazar.bundev@xnvd.com | `team_leader` | Лазар Бундев (team) |
| **Георги Пенев** | georgi.penev@xnvd.com | `team_leader` | Георги Пенев (team) |
| **Камен Георгиев** | kamen.georgiev@xnvd.com | `regional_manager` | Бургас, Пловдив (cities) |

### Role Distribution

- **Office Manager:** 1
- **Team Leader:** 2
- **Regional Manager:** 1
- **Admin:** 0
- **Realtor:** 0

---

## 🔄 Migrations Applied

1. `20251206113815` - initial_schema_setup
2. `20251206113914` - add_new_roles_enum_only
3. `20251206113915` - add_office_manager_role
4. `20251206113917` - add_regional_manager_role
5. `20251206113959` - add_manager_columns_and_policies
6. `20251206115055` - setup_manager_accounts_data

---

## 🔒 Security Advisors

### Security Warnings

1. **Function Search Path Mutable**
   - Function `update_updated_at_column` has a mutable search_path
   - [Remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

2. **Leaked Password Protection Disabled**
   - Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org
   - Enable this feature to enhance security
   - [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

### Performance Warnings

1. **Unindexed Foreign Keys** (7 tables)
   - `buyer_schedule.realtor_id`
   - `cities.country_id`
   - `deals.realtor_id`
   - `diagnoses.realtor_id`
   - `offices.city_id`
   - `realtors.team_id`
   - `teams.office_id`, `teams.leader_id`

2. **Auth RLS Initialization Plan** (Multiple tables)
   - Many RLS policies re-evaluate `auth.<function>()` for each row
   - Should use `(select auth.<function>())` for better performance
   - Affects: profiles, user_roles, countries, teams, realtors, deals, diagnoses, training_progress, realtor_goals, buyer_schedule, messages, cities, offices

3. **Multiple Permissive Policies** (Multiple tables)
   - Some tables have multiple permissive policies for the same role/action
   - Can impact query performance
   - Affects: buyer_schedule, cities, countries, deals, diagnoses, offices, realtor_goals, realtors, teams, training_progress, user_roles

4. **Unused Indexes**
   - `idx_messages_sender_receiver` on `messages` table
   - `idx_messages_receiver_created` on `messages` table

---

## 📊 Database Schema

### Core Tables

- **countries** - Country information
- **cities** - City information with regional manager relationship
- **offices** - Office information with office manager relationship
- **teams** - Team information with team leader relationship
- **realtors** - Realtor profiles and team assignments
- **profiles** - User profiles (linked to auth.users)
- **user_roles** - User role assignments (admin, realtor, team_leader, office_manager, regional_manager)

### Business Tables

- **deals** - Real estate deals
- **diagnoses** - Client diagnoses
- **training_progress** - Training completion tracking
- **realtor_goals** - Monthly goals for realtors
- **buyer_schedule** - Buyer appointment scheduling
- **messages** - Internal messaging system

---

## ✅ Current Status

### ✅ Working
- All migrations applied successfully
- All manager accounts created
- RLS policies configured
- Manager relationships established
- Teams created and assigned to leaders

### ⚠️ Recommendations

1. **Add indexes** for foreign keys to improve query performance
2. **Optimize RLS policies** by using `(select auth.<function>())` pattern
3. **Enable leaked password protection** in Auth settings
4. **Consolidate multiple permissive policies** where possible
5. **Remove unused indexes** or ensure they're being used

---

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qxompdwqdnemsntssjot
- **Project API URL:** https://qxompdwqdnemsntssjot.supabase.co
- **Local App:** http://localhost:5173
- **Vercel Deployment:** https://xnvd.vercel.app

---

## 📝 Notes

- All tables have RLS enabled
- No realtor accounts created yet (0 realtors)
- No deals or diagnoses recorded yet
- All manager accounts are confirmed and ready to use
- Regional manager (Камен Георгиев) manages both Бургас and Пловдив

