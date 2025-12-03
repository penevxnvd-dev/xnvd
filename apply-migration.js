#!/usr/bin/env node
/**
 * Script to apply RLS policy fixes to Supabase database
 * Uses direct PostgreSQL connection via pg library
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import pg, if not available, provide instructions
let pg;
try {
  pg = await import('pg');
} catch (e) {
  console.error('❌ PostgreSQL client (pg) is not installed.');
  console.error('');
  console.error('Please install it first:');
  console.error('  npm install pg');
  console.error('');
  console.error('Or apply the migration manually via Supabase Dashboard:');
  console.error('  1. Go to https://supabase.com/dashboard');
  console.error('  2. Select your project');
  console.error('  3. Go to SQL Editor');
  console.error('  4. Copy contents of: supabase/migrations/20250102000000_fix_rls_policies.sql');
  console.error('  5. Paste and run');
  process.exit(1);
}

const { Client } = pg.default || pg;

// Get database connection from environment
// Supabase connection string format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ Database connection string not found.');
  console.error('');
  console.error('Please set SUPABASE_DB_URL or DATABASE_URL environment variable.');
  console.error('');
  console.error('To get your Supabase database connection string:');
  console.error('  1. Go to https://supabase.com/dashboard');
  console.error('  2. Select your project (ID: ufpeftuanzmkiryohesd)');
  console.error('  3. Go to Settings > Database');
  console.error('  4. Copy the "Connection string" (URI format)');
  console.error('  5. Set it as: export SUPABASE_DB_URL="postgresql://..."');
  console.error('');
  console.error('Or apply the migration manually via Supabase Dashboard SQL Editor.');
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: DB_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected');

    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250102000000_fix_rls_policies.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying RLS policy fixes...');
    
    // Execute the migration SQL
    await client.query(migrationSQL);

    console.log('');
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
    console.log('Admin users can now INSERT, UPDATE, and DELETE rows in these tables.');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('');
    if (error.message.includes('password authentication failed')) {
      console.error('Authentication failed. Please check your database connection string.');
    } else if (error.message.includes('does not exist')) {
      console.error('Policy might already be dropped or never existed. This is OK.');
    } else {
      console.error('Full error:', error);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

