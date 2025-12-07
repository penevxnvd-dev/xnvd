#!/usr/bin/env node

/**
 * Extract all accounts from Supabase
 * Creates a comprehensive report of all users, roles, and related data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
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

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function extractAccounts() {
  log('\n📊 Extracting Accounts from Supabase', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  // Extract profiles with roles
  log('📋 Fetching profiles and roles...', 'blue');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at, updated_at');

  if (profilesError) {
    log(`❌ Error fetching profiles: ${profilesError.message}`, 'red');
    return;
  }

  // Get roles for each profile
  const accounts = [];
  for (const profile of profiles || []) {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, created_at')
      .eq('user_id', profile.id);

    if (rolesError) {
      log(`⚠️  Error fetching roles for ${profile.email}: ${rolesError.message}`, 'yellow');
    }

    // Get realtor info if exists
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id, level, hire_date, team_id')
      .eq('user_id', profile.id)
      .single();

    if (realtorError && realtorError.code !== 'PGRST116') {
      log(`⚠️  Error fetching realtor info for ${profile.email}: ${realtorError.message}`, 'yellow');
    }

    accounts.push({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      roles: roles || [],
      realtor: realtor || null,
    });
  }

  // Get statistics
  log('📊 Calculating statistics...', 'blue');
  const stats = {
    total: accounts.length,
    byRole: {},
    withRealtor: 0,
    withoutRole: 0,
  };

  accounts.forEach(account => {
    if (account.roles.length === 0) {
      stats.withoutRole++;
    }
    if (account.realtor) {
      stats.withRealtor++;
    }
    account.roles.forEach(role => {
      stats.byRole[role.role] = (stats.byRole[role.role] || 0) + 1;
    });
  });

  // Display results
  log('\n📋 Accounts Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total accounts: ${stats.total}`, 'blue');
  log(`Accounts without role: ${stats.withoutRole}`, stats.withoutRole > 0 ? 'yellow' : 'green');
  log(`Accounts with realtor record: ${stats.withRealtor}`, 'blue');
  log('');

  log('Accounts by role:', 'blue');
  Object.entries(stats.byRole).forEach(([role, count]) => {
    log(`  ${role}: ${count}`, 'green');
  });
  log('');

  // Display detailed account list
  log('📋 Detailed Account List', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  accounts.forEach((account, index) => {
    log(`${index + 1}. ${account.full_name} (${account.email})`, 'magenta');
    log(`   ID: ${account.id}`, 'reset');
    log(`   Created: ${new Date(account.created_at).toLocaleString()}`, 'reset');
    
    if (account.roles.length > 0) {
      log(`   Roles: ${account.roles.map(r => r.role).join(', ')}`, 'green');
    } else {
      log(`   Roles: None`, 'yellow');
    }

    if (account.realtor) {
      log(`   Realtor: Level ${account.realtor.level}, Hired: ${account.realtor.hire_date}`, 'blue');
    }
    
    log('');
  });

  // Generate JSON export
  const exportData = {
    extracted_at: new Date().toISOString(),
    statistics: stats,
    accounts: accounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      full_name: acc.full_name,
      created_at: acc.created_at,
      roles: acc.roles.map(r => r.role),
      realtor: acc.realtor ? {
        level: acc.realtor.level,
        hire_date: acc.realtor.hire_date,
        team_id: acc.realtor.team_id,
      } : null,
    })),
  };

  const jsonFile = join(__dirname, 'accounts-export.json');
  writeFileSync(jsonFile, JSON.stringify(exportData, null, 2), 'utf8');
  log(`✅ Accounts exported to: ${jsonFile}`, 'green');

  // Generate CSV export
  const csvRows = [];
  csvRows.push('Email,Full Name,ID,Roles,Realtor Level,Realtor Hire Date,Created At');
  accounts.forEach(acc => {
    const roles = acc.roles.map(r => r.role).join('; ') || 'None';
    const realtorLevel = acc.realtor ? acc.realtor.level : '';
    const realtorHireDate = acc.realtor ? acc.realtor.hire_date : '';
    csvRows.push(
      `"${acc.email}","${acc.full_name}","${acc.id}","${roles}","${realtorLevel}","${realtorHireDate}","${acc.created_at}"`
    );
  });

  const csvFile = join(__dirname, 'accounts-export.csv');
  writeFileSync(csvFile, csvRows.join('\n'), 'utf8');
  log(`✅ Accounts exported to: ${csvFile}`, 'green');

  // Generate markdown report
  const mdRows = [];
  mdRows.push('# Accounts Export');
  mdRows.push('');
  mdRows.push(`**Extracted at:** ${new Date().toLocaleString()}`);
  mdRows.push('');
  mdRows.push('## Statistics');
  mdRows.push('');
  mdRows.push(`- Total accounts: ${stats.total}`);
  mdRows.push(`- Accounts without role: ${stats.withoutRole}`);
  mdRows.push(`- Accounts with realtor record: ${stats.withRealtor}`);
  mdRows.push('');
  mdRows.push('## Accounts by Role');
  mdRows.push('');
  Object.entries(stats.byRole).forEach(([role, count]) => {
    mdRows.push(`- **${role}**: ${count}`);
  });
  mdRows.push('');
  mdRows.push('## Detailed Account List');
  mdRows.push('');
  mdRows.push('| Email | Full Name | Roles | Realtor Level | Created At |');
  mdRows.push('|-------|-----------|-------|---------------|------------|');
  accounts.forEach(acc => {
    const roles = acc.roles.map(r => r.role).join(', ') || 'None';
    const realtorLevel = acc.realtor ? `Level ${acc.realtor.level}` : '-';
    mdRows.push(
      `| ${acc.email} | ${acc.full_name} | ${roles} | ${realtorLevel} | ${new Date(acc.created_at).toLocaleDateString()} |`
    );
  });

  const mdFile = join(__dirname, 'accounts-export.md');
  writeFileSync(mdFile, mdRows.join('\n'), 'utf8');
  log(`✅ Accounts exported to: ${mdFile}`, 'green');

  log('');
  log('='.repeat(60), 'cyan');
  log('✅ Account extraction complete!', 'green');
  log('='.repeat(60), 'cyan');
  log('');
}

// Run extraction
extractAccounts().catch(error => {
  log(`❌ Extraction failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

