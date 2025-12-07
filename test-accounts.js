#!/usr/bin/env node

/**
 * Automated Account Testing Script
 * Tests all account types and their routing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Account types to test
const ACCOUNT_TYPES = [
  'admin',
  'realtor',
  'team_leader',
  'office_manager',
  'regional_manager'
];

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

async function testAccountTypes() {
  log('\n🧪 Testing All Account Types', 'cyan');
  log('='.repeat(50), 'cyan');
  log('');

  // Test 1: Check database for accounts
  log('📋 Test 1: Checking accounts in database...', 'blue');
  log('');

  // First get user_roles
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role, user_id');

  if (rolesError) {
    log(`❌ Error fetching user roles: ${rolesError.message}`, 'red');
    return;
  }

  // Then get profiles for each user_id
  const accounts = [];
  for (const userRole of userRoles || []) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userRole.user_id)
      .single();

    if (!profileError && profile) {
      accounts.push({
        role: userRole.role,
        email: profile.email,
        full_name: profile.full_name
      });
    }
  }

  // Error handling is done per query above

  // Group accounts by role
  const accountsByRole = {};
  ACCOUNT_TYPES.forEach(role => {
    accountsByRole[role] = [];
  });

  accounts.forEach(account => {
    if (accountsByRole[account.role]) {
      accountsByRole[account.role].push(account.profiles);
    }
  });

  // Display results
  let totalAccounts = 0;
  ACCOUNT_TYPES.forEach(role => {
    const accounts = accountsByRole[role];
    totalAccounts += accounts.length;
    
    if (accounts.length > 0) {
      log(`✅ ${role}: ${accounts.length} account(s)`, 'green');
      accounts.forEach(acc => {
        log(`   - ${acc.email} (${acc.full_name})`, 'reset');
      });
    } else {
      log(`⚠️  ${role}: No accounts found`, 'yellow');
    }
    log('');
  });

  log(`Total accounts found: ${totalAccounts}`, 'blue');
  log('');

  // Test 2: Verify dashboard components exist
  log('📋 Test 2: Verifying dashboard components...', 'blue');
  log('');

  const fs = await import('fs');
  const path = await import('path');
  
  const dashboardPaths = {
    admin: 'src/pages/admin/AdminDashboard.tsx',
    realtor: 'src/pages/realtor/RealtorDashboard.tsx',
    team_leader: 'src/pages/team-leader/TeamLeaderDashboard.tsx',
    office_manager: 'src/pages/office-manager/OfficeManagerDashboard.tsx',
    regional_manager: 'src/pages/regional-manager/RegionalManagerDashboard.tsx',
  };

  let allDashboardsExist = true;
  Object.entries(dashboardPaths).forEach(([role, path]) => {
    const fullPath = join(__dirname, path);
    if (fs.existsSync(fullPath)) {
      log(`✅ ${role}: Dashboard component exists`, 'green');
    } else {
      log(`❌ ${role}: Dashboard component missing (${path})`, 'red');
      allDashboardsExist = false;
    }
  });

  log('');

  // Test 3: Verify routing logic
  log('📋 Test 3: Verifying routing logic...', 'blue');
  log('');

  const dashboardFile = join(__dirname, 'src/pages/Dashboard.tsx');
  if (fs.existsSync(dashboardFile)) {
    const content = fs.readFileSync(dashboardFile, 'utf8');
    let allRoutesFound = true;
    
    ACCOUNT_TYPES.forEach(role => {
      const routeCheck = role === 'office_manager' 
        ? content.includes("role === 'office_manager'")
        : content.includes(`role === '${role}'`);
      
      if (routeCheck) {
        log(`✅ ${role}: Routing logic found`, 'green');
      } else {
        log(`❌ ${role}: Routing logic missing`, 'red');
        allRoutesFound = false;
      }
    });

    if (allRoutesFound) {
      log('✅ All routing logic verified', 'green');
    } else {
      log('❌ Some routing logic is missing', 'red');
    }
  } else {
    log('❌ Dashboard.tsx not found', 'red');
  }

  log('');

  // Summary
  log('='.repeat(50), 'cyan');
  log('📊 Test Summary', 'cyan');
  log('='.repeat(50), 'cyan');
  log('');
  log(`Total account types: ${ACCOUNT_TYPES.length}`, 'blue');
  log(`Accounts in database: ${totalAccounts}`, 'blue');
  log(`Dashboard components: ${allDashboardsExist ? '✅ All exist' : '❌ Some missing'}`, allDashboardsExist ? 'green' : 'red');
  log('');

  if (totalAccounts === 0) {
    log('⚠️  No accounts found in database!', 'yellow');
    log('   You may need to create test accounts first.', 'yellow');
    log('');
  }

  log('📝 Next Steps:', 'cyan');
  log('   1. Start the app: npm run dev', 'reset');
  log('   2. Go to http://localhost:5174/auth', 'reset');
  log('   3. Test login with each account type', 'reset');
  log('   4. Verify correct dashboard loads', 'reset');
  log('   5. Check dashboard functionality', 'reset');
  log('');
}

// Run tests
testAccountTypes().catch(error => {
  log(`❌ Test failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

