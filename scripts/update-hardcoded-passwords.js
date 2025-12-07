#!/usr/bin/env node

/**
 * Update hardcoded account passwords with real passwords
 * This script allows setting real passwords for hardcoded accounts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Real passwords for accounts (should be changed to actual passwords)
const REAL_PASSWORDS = {
  'admin@xnvd.com': 'Admin123!', // Admin password
  'krasi.katev@xnvd.com': 'Krasi123!', // Office Manager
  'lazar.bundev@xnvd.com': 'Lazar123!', // Team Leader
  'georgi.penev@xnvd.com': 'Georgi123!', // Team Leader
  'kamen.georgiev@xnvd.com': 'Kamen123!', // Regional Manager
};

console.log('🔄 Updating hardcoded account passwords...\n');

// Read current hardcoded data
const hardcodedPath = join(rootDir, 'src/lib/hardcodedData.ts');
const content = readFileSync(hardcodedPath, 'utf8');

// Extract base64 data
const match = content.match(/const _d = '([^']+)';/);
if (!match) {
  console.error('❌ Could not find hardcoded data');
  process.exit(1);
}

// Decode data
const base64Data = match[1];
const jsonString = Buffer.from(base64Data, 'base64').toString('utf8');
const data = JSON.parse(jsonString);

// Update passwords
console.log('📝 Updating passwords:');
let updated = 0;
for (const [email, password] of Object.entries(REAL_PASSWORDS)) {
  if (data.accounts[email]) {
    data.accounts[email].password = password;
    console.log(`   ✅ ${email}: ${password}`);
    updated++;
  } else {
    console.log(`   ⚠️  Account not found: ${email}`);
  }
}

if (updated === 0) {
  console.log('   ⚠️  No accounts updated');
  process.exit(1);
}

// Re-encode data
const updatedJsonString = JSON.stringify(data);
const updatedBase64 = Buffer.from(updatedJsonString).toString('base64');

// Update file
const updatedContent = content.replace(
  /const _d = '[^']+';/,
  `const _d = '${updatedBase64}';`
);

// Also update generated timestamp
const timestamp = new Date().toISOString();
const finalContent = updatedContent.replace(
  /\/\/ Generated: [^\n]+/,
  `// Generated: ${timestamp}`
);

writeFileSync(hardcodedPath, finalContent, 'utf8');

console.log(`\n✅ Updated ${updated} account passwords`);
console.log('✅ hardcodedData.ts updated\n');

