#!/usr/bin/env node

/**
 * Create auth users via Admin API (requires Service Role Key)
 * Then run create-accounts-and-offices.sql to complete setup
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
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 
                     env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: VITE_SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY (for creating users)');
  console.error('');
  console.error('📖 How to get Service Role Key:');
  console.error('   1. Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api');
  console.error('   2. Find "service_role" key (secret)');
  console.error('   3. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const accounts = [
  {
    email: 'kamen.georgiev@xnvd.com',
    full_name: 'Камен Георгиев',
    password: 'Kamen123!',
  },
  {
    email: 'krasi.katev@xnvd.com',
    full_name: 'Краси Кътев',
    password: 'Krasi123!',
  },
  {
    email: 'georgi.penev@xnvd.com',
    full_name: 'Георги Пенев',
    password: 'Georgi123!',
  },
  {
    email: 'lazar.bundev@xnvd.com',
    full_name: 'Лазар Бундев',
    password: 'Lazar123!',
  },
];

async function createUsers() {
  console.log('🚀 Creating auth users...\n');

  for (const account of accounts) {
    try {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === account.email);

      if (existing) {
        console.log(`✅ User already exists: ${account.email}`);
        continue;
      }

      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
        },
      });

      if (error) {
        console.error(`❌ Error creating ${account.email}: ${error.message}`);
      } else {
        console.log(`✅ User created: ${account.email} (${account.full_name})`);
        console.log(`   Password: ${account.password}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ User creation complete!');
  console.log('\n📋 Next step:');
  console.log('   Run create-accounts-and-offices.sql in Supabase SQL Editor');
  console.log('   https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new');
}

createUsers().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

