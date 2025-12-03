# Prisma ↔ Supabase Automatic Sync

## Overview

The application now has **automatic bidirectional sync** between Prisma ORM and Supabase. All database operations performed through Prisma are automatically synchronized to Supabase in real-time.

## How It Works

### Prisma Extension

A custom Prisma extension (`server/src/lib/prisma.ts`) intercepts all database operations and automatically syncs them to Supabase:

- **Create operations** → Insert into Supabase
- **Update operations** → Update in Supabase
- **Upsert operations** → Upsert in Supabase
- **Delete operations** → Delete from Supabase
- **DeleteMany operations** → Delete from Supabase

### Model Mapping

The extension automatically maps Prisma models to Supabase table names:

| Prisma Model | Supabase Table |
|-------------|----------------|
| `Profile` | `profiles` |
| `User` | `users` |
| `UserRole` | `user_roles` |
| `Country` | `countries` |
| `City` | `cities` |
| `Office` | `offices` |
| `Team` | `teams` |
| `Realtor` | `realtors` |
| `Deal` | `deals` |
| `Diagnosis` | `diagnoses` |
| `TrainingSection` | `training_sections` |
| `TrainingProgress` | `training_progress` |
| `RealtorGoal` | `realtor_goals` |
| `BuyerSchedule` | `buyer_schedule` |

### Field Name Conversion

The extension automatically converts:
- **camelCase** → **snake_case** (e.g., `userId` → `user_id`)
- **Date objects** → **ISO strings**
- **Nested relations** are skipped (only direct fields are synced)

## Usage

### Using Prisma (Recommended)

All Prisma operations automatically sync to Supabase:

```typescript
import { prisma } from '../lib/prisma.js';

// Create - automatically synced to Supabase
const realtor = await prisma.realtor.create({
  data: {
    userId: '...',
    teamId: '...',
    level: 1,
  },
});

// Update - automatically synced to Supabase
await prisma.realtor.update({
  where: { id: '...' },
  data: { level: 2 },
});

// Delete - automatically synced to Supabase
await prisma.realtor.delete({
  where: { id: '...' },
});
```

### Using Supabase Directly

If you use Supabase directly (e.g., `supabaseAdmin.from('realtors').insert(...)`), the data will be in Supabase, but **won't automatically sync back to Prisma**. 

**Recommendation:** Use Prisma for all database operations to ensure automatic sync.

## Configuration

### Environment Variables

The sync requires Supabase credentials:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

If these are not set, the sync will be skipped (no errors).

### Logging

In development mode, sync operations are logged:
- ✅ Success: `✅ Synced {Model} {operation} to Supabase`
- ❌ Error: `❌ Failed to sync {Model} {operation} to Supabase: {error}`

In production, only errors are logged.

## Important Notes

1. **Async Sync**: Sync operations run asynchronously and don't block the main operation. If sync fails, the Prisma operation still succeeds.

2. **Idempotency**: The sync is designed to be safe - if Supabase already has the data, it will be updated rather than duplicated.

3. **Relations**: Nested relations (e.g., `user`, `profile`) are not synced automatically. Only direct model fields are synced.

4. **Performance**: Sync operations are non-blocking and run in the background, so they don't impact application performance.

## Troubleshooting

### Sync Not Working

1. Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Check backend logs for sync errors
3. Verify Supabase connection is working

### Data Mismatch

If data is out of sync:
1. Check Prisma operations are using the centralized `prisma` client from `lib/prisma.ts`
2. Verify Supabase table structure matches Prisma schema
3. Check for sync errors in logs

## Migration Guide

### Before

```typescript
// Old way - no sync
const prisma = new PrismaClient();
await prisma.realtor.create({ ... });
```

### After

```typescript
// New way - automatic sync
import { prisma } from '../lib/prisma.js';
await prisma.realtor.create({ ... });
```

All routes have been updated to use the centralized Prisma client with automatic sync.

