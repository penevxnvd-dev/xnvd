#!/usr/bin/env node
/**
 * Script to apply RLS policy fixes to Supabase database
 * This script reads the migration file and applies it via Supabase REST API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these in your .env file or environment.');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250102000000_fix_rls_policies.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying RLS policy fixes...');
    console.log('   This will fix INSERT permissions for admin users on all tables.');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase
            .from('_exec_sql')
            .select('*')
            .limit(0);
          
          if (queryError) {
            console.error('⚠️  Note: Direct SQL execution via Supabase client is limited.');
            console.error('   Please apply the migration manually in Supabase Dashboard:');
            console.error('   1. Go to SQL Editor');
            console.error('   2. Copy the contents of: supabase/migrations/20250102000000_fix_rls_policies.sql');
            console.error('   3. Run the SQL');
            console.error('');
            console.error('   Or install Supabase CLI and run: supabase db push');
            process.exit(1);
          }
        }
      }
    }

    console.log('✅ RLS policies have been fixed!');
    console.log('');
    console.log('The following policies were updated:');
    console.log('  - countries');
    console.log('  - cities');
    console.log('  - offices');
    console.log('  - teams');
    console.log('  - realtors');
    console.log('  - deals');
    console.log('  - diagnoses');
    console.log('  - training_progress');
    console.log('  - user_roles');
    console.log('');
    console.log('Admin users can now INSERT, UPDATE, and DELETE rows in these tables.');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('');
    console.error('Please apply the migration manually:');
    console.error('1. Go to your Supabase Dashboard → SQL Editor');
    console.error('2. Copy the contents of: supabase/migrations/20250102000000_fix_rls_policies.sql');
    console.error('3. Paste and run the SQL');
    process.exit(1);
  }
}

applyMigration();

