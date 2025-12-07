#!/usr/bin/env node

/**
 * Sync Supabase data to local backup AND generate hardcoded data
 * This script does both operations in one go
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔄 Starting sync and hardcode generation...\n');

try {
  // Step 1: Sync Supabase to local backup
  console.log('📥 Step 1: Syncing Supabase to local backup...');
  execSync('node sync-supabase-to-backup.js', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('✅ Local backup sync complete\n');

  // Step 2: Generate hardcoded data from backup
  console.log('💾 Step 2: Generating hardcoded data from backup...');
  execSync('node scripts/extract-and-hardcode.js', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('✅ Hardcoded data generation complete\n');

  console.log('🎉 Sync and hardcode complete!');
  console.log('   - Local backup updated');
  console.log('   - Hardcoded data updated');
  console.log('   - App ready for offline use\n');
} catch (error) {
  console.error('❌ Error during sync and hardcode:', error);
  process.exit(1);
}

