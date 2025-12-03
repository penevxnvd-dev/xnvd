import { PrismaClient } from '@prisma/client';
import { supabaseAdmin } from './supabase.js';

// Create Prisma client instance
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Map Prisma models to Supabase table names
const modelToTableMap: Record<string, string> = {
  Profile: 'profiles',
  User: 'users',
  UserRole: 'user_roles',
  Country: 'countries',
  City: 'cities',
  Office: 'offices',
  Team: 'teams',
  Realtor: 'realtors',
  Deal: 'deals',
  Diagnosis: 'diagnoses',
  TrainingSection: 'training_sections',
  TrainingProgress: 'training_progress',
  RealtorGoal: 'realtor_goals',
  BuyerSchedule: 'buyer_schedule',
};

// Helper function to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Helper function to convert Prisma data to Supabase format
function convertToSupabaseFormat(model: string, data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const converted: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip Prisma internal fields
    if (key.startsWith('_') || key === 'user' || key === 'profile') {
      continue;
    }
    
    // Convert camelCase to snake_case
    const snakeKey = toSnakeCase(key);
    
    // Handle special cases
    if (value instanceof Date) {
      converted[snakeKey] = value.toISOString();
    } else if (value === null || value === undefined) {
      // Include null values for updates
      converted[snakeKey] = null;
    } else if (Array.isArray(value)) {
      // Skip arrays (relations)
      continue;
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      // Skip nested objects (relations)
      continue;
    } else {
      converted[snakeKey] = value;
    }
  }
  
  return converted;
}

// Helper function to convert Prisma where clause to Supabase format
function convertWhereToSupabase(where: any): any {
  if (!where || typeof where !== 'object') return where;
  
  const converted: any = {};
  
  for (const [key, value] of Object.entries(where)) {
    const snakeKey = toSnakeCase(key);
    
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      // Handle Prisma operators (in, notIn, etc.)
      if ('in' in value) {
        converted[snakeKey] = value.in;
      } else if ('equals' in value) {
        converted[snakeKey] = value.equals;
      } else {
        // For complex where clauses, use the key directly
        converted[snakeKey] = value;
      }
    } else {
      converted[snakeKey] = value;
    }
  }
  
  return converted;
}

// Helper function to sync data to Supabase
async function syncToSupabase(model: string, operation: 'create' | 'update' | 'delete' | 'upsert', data: any, where?: any, result?: any) {
  const tableName = modelToTableMap[model];
  if (!tableName) {
    console.warn(`⚠️  No Supabase table mapping for model: ${model}`);
    return;
  }

  // Skip sync if Supabase is not configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  try {
    if (operation === 'create') {
      const supabaseData = convertToSupabaseFormat(model, result || data);
      // Remove id if it's auto-generated (Supabase will generate it)
      if (supabaseData.id && supabaseData.id.includes('-')) {
        // Keep UUID if provided
      }
      const { error } = await supabaseAdmin.from(tableName).insert(supabaseData);
      if (error) {
        console.error(`❌ Failed to sync ${model} create to Supabase:`, error.message);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Synced ${model} create to Supabase`);
        }
      }
    } else if (operation === 'update') {
      const supabaseData = convertToSupabaseFormat(model, data);
      const supabaseWhere = convertWhereToSupabase(where);
      const { error } = await supabaseAdmin.from(tableName).update(supabaseData).match(supabaseWhere);
      if (error) {
        console.error(`❌ Failed to sync ${model} update to Supabase:`, error.message);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Synced ${model} update to Supabase`);
        }
      }
    } else if (operation === 'delete') {
      const supabaseWhere = convertWhereToSupabase(where);
      const { error } = await supabaseAdmin.from(tableName).delete().match(supabaseWhere);
      if (error) {
        console.error(`❌ Failed to sync ${model} delete to Supabase:`, error.message);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Synced ${model} delete to Supabase`);
        }
      }
    } else if (operation === 'upsert') {
      // For upsert, we need to handle both create and update
      const supabaseData = convertToSupabaseFormat(model, result || data);
      const supabaseWhere = convertWhereToSupabase(where);
      const { error } = await supabaseAdmin.from(tableName).upsert(supabaseData, { onConflict: Object.keys(supabaseWhere).join(',') });
      if (error) {
        console.error(`❌ Failed to sync ${model} upsert to Supabase:`, error.message);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Synced ${model} upsert to Supabase`);
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Error syncing ${model} to Supabase:`, error.message);
  }
}

// Create Prisma extension for automatic sync
const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async create({ model, operation, args, query }) {
        const result = await query(args);
        // Sync to Supabase after create (async, don't wait)
        syncToSupabase(model, 'create', args.data, undefined, result).catch(() => {});
        return result;
      },
      async update({ model, operation, args, query }) {
        const result = await query(args);
        // Sync to Supabase after update (async, don't wait)
        syncToSupabase(model, 'update', args.data, args.where, result).catch(() => {});
        return result;
      },
      async updateMany({ model, operation, args, query }) {
        const result = await query(args);
        // Sync to Supabase after updateMany (async, don't wait)
        syncToSupabase(model, 'update', args.data, args.where).catch(() => {});
        return result;
      },
      async upsert({ model, operation, args, query }) {
        const result = await query(args);
        // Sync to Supabase after upsert (async, don't wait)
        syncToSupabase(model, 'upsert', args.create || args.update, args.where, result).catch(() => {});
        return result;
      },
      async delete({ model, operation, args, query }) {
        const result = await query(args);
        // Sync to Supabase after delete (async, don't wait)
        syncToSupabase(model, 'delete', {}, args.where).catch(() => {});
        return result;
      },
      async deleteMany({ model, operation, args, query }) {
        const result = await query(args);
        // Sync to Supabase after deleteMany (async, don't wait)
        syncToSupabase(model, 'delete', {}, args.where).catch(() => {});
        return result;
      },
    },
  },
}) as unknown as PrismaClient;

// Export the extended Prisma client
export { prisma };

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

