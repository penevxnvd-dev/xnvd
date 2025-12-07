#!/usr/bin/env node

/**
 * Check which migrations have been applied to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
function loadEnv() {
  try {
    const envFile = readFileSync(join(rootDir, '.env'), 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    return env;
  } catch (error) {
    console.error('❌ Error loading .env file:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMigrations() {
  console.log('🔍 Checking Supabase migrations status...\n');

  // Check if schema_migrations table exists (Supabase tracks migrations)
  const { data: migrations, error: migrationsError } = await supabase
    .from('schema_migrations')
    .select('*')
    .order('version', { ascending: false })
    .limit(20);

  if (migrationsError) {
    console.log('⚠️  Could not check schema_migrations table (may not exist)');
    console.log('   This is normal if migrations were applied manually\n');
  } else if (migrations && migrations.length > 0) {
    console.log(`✅ Found ${migrations.length} applied migrations:\n`);
    migrations.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.version || m.name || 'Unknown'}`);
    });
    console.log('');
  }

  // Check database schema
  console.log('📊 Checking database schema...\n');

  // Check if tables exist
  const tables = [
    'profiles',
    'user_roles',
    'countries',
    'cities',
    'offices',
    'teams',
    'realtors',
    'deals',
    'diagnoses',
    'training_progress',
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('count', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ ${table}: Table does not exist`);
      } else {
        console.log(`⚠️  ${table}: ${error.message}`);
      }
    } else {
      console.log(`✅ ${table}: Table exists (${data?.count || 0} records)`);
    }
  }

  // Check if app_role enum exists and what values it has
  console.log('\n🔍 Checking app_role enum...\n');
  const { data: enumData, error: enumError } = await supabase.rpc('get_app_roles', {}).catch(() => ({ data: null, error: { message: 'Function does not exist' } }));

  if (enumError) {
    // Try direct query
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .limit(100);

    if (!rolesError && roles && roles.length > 0) {
      const uniqueRoles = [...new Set(roles.map(r => r.role))];
      console.log(`✅ Found roles in use: ${uniqueRoles.join(', ')}`);
    } else {
      console.log('⚠️  Could not determine available roles');
      console.log('   Expected roles: admin, realtor, team_leader, office_manager, regional_manager');
    }
  }

  // Check for manager_id columns
  console.log('\n🔍 Checking for manager_id columns...\n');
  
  const { data: citiesSample } = await supabase
    .from('cities')
    .select('*')
    .limit(1);

  if (citiesSample && citiesSample.length > 0) {
    const city = citiesSample[0];
    if ('manager_id' in city) {
      console.log('✅ cities.manager_id column exists');
    } else {
      console.log('❌ cities.manager_id column missing (migration not applied)');
    }
  } else {
    console.log('⚠️  Could not check cities.manager_id (no cities in database)');
  }

  const { data: officesSample } = await supabase
    .from('offices')
    .select('*')
    .limit(1);

  if (officesSample && officesSample.length > 0) {
    const office = officesSample[0];
    if ('manager_id' in office) {
      console.log('✅ offices.manager_id column exists');
    } else {
      console.log('❌ offices.manager_id column missing (migration not applied)');
    }
  } else {
    console.log('⚠️  Could not check offices.manager_id (no offices in database)');
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Migration Status Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('To apply migrations:');
  console.log('1. Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new');
  console.log('2. Copy and paste the content of: supabase/migrations/1765019480729_apply_migrations.sql');
  console.log('3. Click "Run" to execute\n');
}

checkMigrations().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

