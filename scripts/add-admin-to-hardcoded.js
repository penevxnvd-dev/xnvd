#!/usr/bin/env node

/**
 * Add admin account to hardcoded data
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const hardcodedDataPath = join(rootDir, 'src/lib/hardcodedData.ts');

// Admin account data
const ADMIN_ID = '00000000-0000-0000-0000-000000000001'; // Fixed UUID for admin
const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

// Read current hardcoded data file
const fileContent = readFileSync(hardcodedDataPath, 'utf8');

// Extract the base64 encoded data
const base64Match = fileContent.match(/const _d = '([^']+)';/);
if (!base64Match) {
  console.error('❌ Could not find base64 data in hardcodedData.ts');
  process.exit(1);
}

const base64Data = base64Match[1];

// Decode the data
let data;
try {
  data = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8'));
} catch (error) {
  console.error('❌ Error decoding hardcoded data:', error.message);
  process.exit(1);
}

// Add admin account
data.accounts = data.accounts || {};
data.accounts[ADMIN_EMAIL] = {
  id: ADMIN_ID,
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD, // Note: In production, this should be hashed
  full_name: ADMIN_NAME,
};

// Add admin profile
data.profiles = data.profiles || [];
const existingProfileIndex = data.profiles.findIndex(p => p.id === ADMIN_ID);
const adminProfile = {
  id: ADMIN_ID,
  full_name: ADMIN_NAME,
  email: ADMIN_EMAIL,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

if (existingProfileIndex >= 0) {
  data.profiles[existingProfileIndex] = adminProfile;
} else {
  data.profiles.push(adminProfile);
}

// Add admin role
data.user_roles = data.user_roles || [];
const existingRoleIndex = data.user_roles.findIndex(
  ur => ur.user_id === ADMIN_ID && ur.role === 'admin'
);
const adminRole = {
  id: '00000000-0000-0000-0000-000000000002',
  user_id: ADMIN_ID,
  role: 'admin',
  created_at: new Date().toISOString(),
};

if (existingRoleIndex >= 0) {
  data.user_roles[existingRoleIndex] = adminRole;
} else {
  data.user_roles.push(adminRole);
}

// Update generated_at timestamp
data.generated_at = new Date().toISOString();

// Encode back to base64
const newBase64Data = Buffer.from(JSON.stringify(data)).toString('base64');

// Replace the base64 data in the file
const newFileContent = fileContent.replace(
  /const _d = '[^']+';/,
  `const _d = '${newBase64Data}';`
);

// Write the updated file
writeFileSync(hardcodedDataPath, newFileContent, 'utf8');

console.log('✅ Admin account added to hardcoded data!');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 Email:    ', ADMIN_EMAIL);
console.log('🔑 Password: ', ADMIN_PASSWORD);
console.log('👤 Name:     ', ADMIN_NAME);
console.log('👑 Role:     admin');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('✅ You can now login with this account even when offline!');

