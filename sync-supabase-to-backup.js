#!/usr/bin/env node

/**
 * Sync Supabase data to local backup
 * Fetches all important data from Supabase and saves it locally
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  try {
    const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
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

// Local backup directories
const BACKUP_DIR = join(__dirname, 'local-backup');
const DATA_DIR = join(BACKUP_DIR, 'data');
const PUBLIC_BACKUP_DIR = join(__dirname, 'public', 'local-backup');
const PUBLIC_DATA_DIR = join(PUBLIC_BACKUP_DIR, 'data');

// Ensure directories exist
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function syncTable(tableName, selectQuery = '*') {
  try {
    log(`📋 Syncing ${tableName}...`, 'blue');
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery);

    if (error) {
      log(`⚠️  Error syncing ${tableName}: ${error.message}`, 'yellow');
      return null;
    }

    const filePath = join(DATA_DIR, `${tableName}.json`);
    const publicFilePath = join(PUBLIC_DATA_DIR, `${tableName}.json`);
    const jsonData = JSON.stringify(data || [], null, 2);
    
    // Write to both locations
    writeFileSync(filePath, jsonData, 'utf8');
    writeFileSync(publicFilePath, jsonData, 'utf8');
    
    log(`✅ ${tableName}: ${data?.length || 0} records`, 'green');
    return data;
  } catch (error) {
    log(`❌ Error syncing ${tableName}: ${error.message}`, 'red');
    return null;
  }
}

async function syncAllData() {
  log('\n🔄 Syncing Supabase Data to Local Backup', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  const syncResults = {
    timestamp: new Date().toISOString(),
    tables: {},
    errors: [],
  };

  // Sync all important tables
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
    'realtor_goals',
    'buyer_schedule',
    'messages',
  ];

  for (const table of tables) {
    const data = await syncTable(table);
    syncResults.tables[table] = {
      count: data?.length || 0,
      synced: data !== null,
    };
    if (data === null) {
      syncResults.errors.push(table);
    }
  }

  // Create index file for quick lookup
  log('\n📝 Creating index file...', 'blue');
  const indexData = {
    synced_at: syncResults.timestamp,
    tables: Object.keys(syncResults.tables),
    counts: Object.fromEntries(
      Object.entries(syncResults.tables).map(([table, info]) => [table, info.count])
    ),
    errors: syncResults.errors,
  };

  const indexJson = JSON.stringify(indexData, null, 2);
  writeFileSync(join(DATA_DIR, 'index.json'), indexJson, 'utf8');
  writeFileSync(join(PUBLIC_DATA_DIR, 'index.json'), indexJson, 'utf8');
  log('✅ Index file created', 'green');

  // Create metadata file
  const metadata = {
    last_sync: syncResults.timestamp,
    supabase_url: SUPABASE_URL,
    tables_synced: Object.keys(syncResults.tables).length,
    total_records: Object.values(syncResults.tables).reduce((sum, info) => sum + info.count, 0),
    errors: syncResults.errors.length,
  };

  const metadataJson = JSON.stringify(metadata, null, 2);
  writeFileSync(join(BACKUP_DIR, 'metadata.json'), metadataJson, 'utf8');
  writeFileSync(join(PUBLIC_BACKUP_DIR, 'metadata.json'), metadataJson, 'utf8');

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Sync Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Tables synced: ${Object.keys(syncResults.tables).length}`, 'blue');
  log(`Total records: ${metadata.total_records}`, 'blue');
  log(`Errors: ${syncResults.errors.length}`, syncResults.errors.length > 0 ? 'yellow' : 'green');
  log(`Backup location: ${BACKUP_DIR}`, 'blue');
  log('');

  if (syncResults.errors.length > 0) {
    log('⚠️  Tables with errors:', 'yellow');
    syncResults.errors.forEach(table => {
      log(`   - ${table}`, 'yellow');
    });
    log('');
  }

  log('✅ Sync complete!', 'green');
  log('');

  return syncResults;
}

// Run sync
syncAllData().catch(error => {
  log(`❌ Sync failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

