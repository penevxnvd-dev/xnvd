#!/usr/bin/env node

/**
 * Check Supabase connection and show all data
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

console.log('🔍 Checking Supabase connection...');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key: ${SUPABASE_KEY.substring(0, 20)}...\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConnection() {
  // Test connection
  console.log('📡 Testing connection...');
  const { data: health, error: healthError } = await supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true });

  if (healthError) {
    console.error('❌ Connection error:', healthError.message);
    console.error('   Code:', healthError.code);
    console.error('   Details:', healthError.details);
    console.error('   Hint:', healthError.hint);
    return;
  }

  console.log('✅ Connection successful!\n');

  // Check all tables
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
  ];

  console.log('📊 Checking tables...\n');

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(5);

      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0} records`);
        if (data && data.length > 0) {
          console.log(`   Sample:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // Show all accounts
  console.log('\n👥 Fetching all accounts...\n');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message);
  } else if (!profiles || profiles.length === 0) {
    console.log('⚠️  No profiles found in database');
    console.log('   The database appears to be empty.');
    console.log('   You may need to:');
    console.log('   1. Create accounts through the app');
    console.log('   2. Import data from another source');
    console.log('   3. Check RLS policies if data exists but is not accessible');
  } else {
    console.log(`✅ Found ${profiles.length} profiles:\n`);
    
    for (const profile of profiles) {
      // Get roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);

      const roleList = roles?.map(r => r.role).join(', ') || 'None';
      
      console.log(`📧 ${profile.email}`);
      console.log(`   Name: ${profile.full_name || 'N/A'}`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Roles: ${roleList}`);
      console.log(`   Created: ${profile.created_at || 'N/A'}`);
      console.log('');
    }
  }
}

checkConnection().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

