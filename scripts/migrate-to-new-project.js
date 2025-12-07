#!/usr/bin/env node

/**
 * Migrate all data from local backup to new Supabase project
 * This script reads data from local-backup/ and inserts it into the new project
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qpzobbrxnurreeybhubt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing Supabase key');
  console.error('   Set VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const backupDir = join(rootDir, 'local-backup');

async function migrateTable(tableName, transformFn = null) {
  const filePath = join(backupDir, `${tableName}.json`);
  
  if (!existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return { inserted: 0, skipped: 0 };
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`   ⏭️  ${tableName}: No data to migrate`);
      return { inserted: 0, skipped: 0 };
    }

    // Transform data if needed
    const transformedData = transformFn ? data.map(transformFn) : data;

    // Check existing data
    const { data: existingData } = await supabase.from(tableName).select('id').limit(1);
    
    if (existingData && existingData.length > 0) {
      console.log(`   ⚠️  ${tableName}: Data already exists, skipping...`);
      return { inserted: 0, skipped: data.length };
    }

    // Insert data
    const { data: inserted, error } = await supabase
      .from(tableName)
      .insert(transformedData)
      .select();

    if (error) {
      console.error(`   ❌ ${tableName}: Error -`, error.message);
      return { inserted: 0, skipped: 0, error: error.message };
    }

    console.log(`   ✅ ${tableName}: Inserted ${inserted?.length || 0} records`);
    return { inserted: inserted?.length || 0, skipped: 0 };
  } catch (error) {
    console.error(`   ❌ ${tableName}: Error -`, error.message);
    return { inserted: 0, skipped: 0, error: error.message };
  }
}

async function migrateAuthUsers() {
  console.log('\n👤 Migrating auth users...');
  
  const profilesPath = join(backupDir, 'profiles.json');
  if (!existsSync(profilesPath)) {
    console.log('   ⚠️  profiles.json not found');
    return;
  }

  const profiles = JSON.parse(readFileSync(profilesPath, 'utf8'));
  
  for (const profile of profiles) {
    try {
      // Check if user exists
      const { data: existingUser } = await supabase.auth.admin.getUserById(profile.id);
      
      if (existingUser?.user) {
        console.log(`   ⏭️  User ${profile.email} already exists`);
        continue;
      }

      // Create auth user (this requires service role key)
      // Note: We'll need to create users manually or use a different approach
      console.log(`   ⚠️  Auth user creation requires manual setup for ${profile.email}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check/create user ${profile.email}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting data migration to new Supabase project...\n');
  console.log(`📦 Source: ${backupDir}`);
  console.log(`🎯 Target: ${SUPABASE_URL}\n`);

  const results = {
    countries: await migrateTable('countries'),
    cities: await migrateTable('cities'),
    offices: await migrateTable('offices'),
    teams: await migrateTable('teams'),
    profiles: await migrateTable('profiles'),
    user_roles: await migrateTable('user_roles'),
    realtors: await migrateTable('realtors'),
    deals: await migrateTable('deals'),
    diagnoses: await migrateTable('diagnoses'),
    training_progress: await migrateTable('training_progress'),
    realtor_goals: await migrateTable('realtor_goals'),
    buyer_schedule: await migrateTable('buyer_schedule'),
    messages: await migrateTable('messages'),
  };

  // Migrate auth users (if possible)
  await migrateAuthUsers();

  console.log('\n📊 Migration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let totalInserted = 0;
  let totalSkipped = 0;
  
  for (const [table, result] of Object.entries(results)) {
    totalInserted += result.inserted || 0;
    totalSkipped += result.skipped || 0;
    const status = result.error ? '❌' : (result.inserted > 0 ? '✅' : '⏭️');
    console.log(`${status} ${table.padEnd(20)} Inserted: ${(result.inserted || 0).toString().padStart(4)} Skipped: ${(result.skipped || 0).toString().padStart(4)}`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 Total: ${totalInserted} inserted, ${totalSkipped} skipped\n`);
  
  if (totalInserted > 0) {
    console.log('✅ Migration completed successfully!');
  } else if (totalSkipped > 0) {
    console.log('⚠️  All data already exists in the new project.');
  } else {
    console.log('❌ No data was migrated. Check errors above.');
  }
}

main().catch(console.error);

