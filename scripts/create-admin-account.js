#!/usr/bin/env node

/**
 * Create admin account via Supabase Admin API
 * Uses Service Role Key to create auth user, profile, and role
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
// Use publishable key (anon key) as service role key
// User indicated: service role key = supabase publishable key
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 
                             env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                             env.SUPABASE_SERVICE_KEY ||
                             env.SERVICE_ROLE_KEY ||
                             env.SUPABASE_SERVICE_ROLE ||
                             env.VITE_SUPABASE_PUBLISHABLE_KEY ||
                             env.VITE_SUPABASE_ANON_KEY ||
                             env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing Supabase URL');
  console.error('   Required: VITE_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Service Role Key');
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY');
  console.error('');
  console.error('📖 How to get Service Role Key:');
  console.error('   1. Go to: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api');
  console.error('   2. Find "service_role" key (secret)');
  console.error('   3. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('');
  console.error('⚠️  Note: Service Role Key is required to create auth users via Admin API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

async function createAdmin() {
  console.log('🚀 Creating admin account...\n');
  console.log('📧 Email:', ADMIN_EMAIL);
  console.log('🔑 Password:', ADMIN_PASSWORD);
  console.log('👤 Name:', ADMIN_NAME);
  console.log('');

  try {
    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);
    let userId;

    if (existingUser) {
      console.log('⚠️  User already exists. Using existing account...');
      userId = existingUser.id;
    } else {
      // Create auth user
      console.log('📝 Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_NAME,
        },
      });

      if (authError) {
        console.error('❌ Error creating auth user:', authError.message);
        throw authError;
      }

      userId = authData.user.id;
      console.log('✅ Auth user created successfully');
    }

    // Create/update profile
    console.log('📝 Creating/updating profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: ADMIN_NAME,
        email: ADMIN_EMAIL,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message);
      throw profileError;
    }
    console.log('✅ Profile created/updated successfully');

    // Add admin role
    console.log('📝 Adding admin role...');
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin',
      }, {
        onConflict: 'user_id,role',
      })
      .select()
      .single();

    if (roleError) {
      console.error('❌ Error adding role:', roleError.message);
      throw roleError;
    }
    console.log('✅ Admin role added successfully');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', ADMIN_EMAIL);
    console.log('🔑 Password: ', ADMIN_PASSWORD);
    console.log('👤 Name:     ', ADMIN_NAME);
    console.log('👑 Role:     admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.message.includes('JWT') || error.message.includes('Invalid API key')) {
      console.error('\n⚠️  Using publishable key (anon key) - some operations may be limited by RLS');
      console.error('   For full admin access, consider using SERVICE_ROLE_KEY from Supabase Dashboard > Settings > API\n');
    }
    process.exit(1);
  }
}

createAdmin().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

