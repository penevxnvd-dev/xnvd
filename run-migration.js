#!/usr/bin/env node
/**
 * Apply RLS Policy Fix Migration to Supabase
 * 
 * Usage:
 *   1. Get your Supabase database connection string from:
 *      https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/settings/database
 *      (Look for "Connection string" -> "URI")
 * 
 *   2. Set it as environment variable:
 *      export SUPABASE_DB_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
 * 
 *   3. Run this script:
 *      node run-migration.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database connection
const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ Database connection string not found.');
  console.error('');
  console.error('Please set SUPABASE_DB_URL environment variable.');
  console.error('');
  console.error('To get your Supabase database connection string:');
  console.error('  1. Go to: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/settings/database');
  console.error('  2. Scroll to "Connection string" section');
  console.error('  3. Select "URI" format');
  console.error('  4. Copy the connection string');
  console.error('  5. Run: export SUPABASE_DB_URL="postgresql://..."');
  console.error('  6. Then run this script again');
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: DB_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250102000000_fix_rls_policies.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying RLS policy fixes...');
    console.log('');
    
    // Execute the migration SQL
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('The following RLS policies have been fixed:');
    console.log('  ✅ countries');
    console.log('  ✅ cities');
    console.log('  ✅ offices');
    console.log('  ✅ teams');
    console.log('  ✅ realtors');
    console.log('  ✅ deals');
    console.log('  ✅ diagnoses');
    console.log('  ✅ training_progress');
    console.log('  ✅ user_roles');
    console.log('');
    console.log('🎉 Admin users can now INSERT, UPDATE, and DELETE rows!');
    console.log('   The database is ready for use.');

  } catch (error) {
    console.error('');
    console.error('❌ Error applying migration:', error.message);
    console.error('');
    
    if (error.message.includes('password authentication failed')) {
      console.error('Authentication failed. Please check your database connection string and password.');
    } else if (error.message.includes('does not exist')) {
      console.error('Note: Some policies might already be dropped. This is OK.');
      console.error('The migration should still complete successfully.');
    } else {
      console.error('Full error details:', error);
    }
    
    console.error('');
    console.error('If you continue to have issues, apply the migration manually:');
    console.error('  1. Go to: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/sql/new');
    console.error('  2. Copy contents of: supabase/migrations/20250102000000_fix_rls_policies.sql');
    console.error('  3. Paste and run in SQL Editor');
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

