#!/usr/bin/env node

/**
 * Create initial data structure for XNVD app
 * - Country: България
 * - Cities: Варна, София, Пловдив, Бургас
 * - Offices with addresses
 * - Accounts with proper roles
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
// Try service role key first (bypasses RLS), fallback to anon key
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 
                     env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                     env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     env.VITE_SUPABASE_ANON_KEY || 
                     env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)');
  process.exit(1);
}

// Use service role key if available (bypasses RLS)
const isServiceRole = SUPABASE_KEY.includes('service_role') || 
                      env.SUPABASE_SERVICE_ROLE_KEY || 
                      env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!isServiceRole) {
  console.warn('⚠️  Warning: Using anon key. RLS policies may block inserts.');
  console.warn('   For best results, use SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

async function createInitialData() {
  log('\n🚀 Creating Initial Data Structure', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  try {
    // Step 1: Create Country
    log('📌 Step 1: Creating country...', 'blue');
    let countryId;
    
    const { data: existingCountry } = await supabase
      .from('countries')
      .select('id')
      .eq('name', 'България')
      .single();

    if (existingCountry) {
      countryId = existingCountry.id;
      log('✅ Country already exists: България', 'green');
    } else {
      const { data: country, error: countryError } = await supabase
        .from('countries')
        .insert({ name: 'България', code: 'BG' })
        .select()
        .single();

      if (countryError) {
        log(`❌ Error creating country: ${countryError.message}`, 'red');
        throw countryError;
      }

      countryId = country.id;
      log('✅ Country created: България', 'green');
    }

    // Step 2: Create Cities
    log('\n📌 Step 2: Creating cities...', 'blue');
    const cities = [
      { name: 'Варна', countryId },
      { name: 'София', countryId },
      { name: 'Пловдив', countryId },
      { name: 'Бургас', countryId },
    ];

    const cityMap = {};
    for (const city of cities) {
      const { data: existingCity } = await supabase
        .from('cities')
        .select('id')
        .eq('name', city.name)
        .eq('country_id', countryId)
        .single();

      if (existingCity) {
        cityMap[city.name] = existingCity.id;
        log(`✅ City already exists: ${city.name}`, 'green');
      } else {
        const { data: newCity, error: cityError } = await supabase
          .from('cities')
          .insert({ name: city.name, country_id: countryId })
          .select()
          .single();

        if (cityError) {
          log(`❌ Error creating city ${city.name}: ${cityError.message}`, 'red');
          throw cityError;
        }

        cityMap[city.name] = newCity.id;
        log(`✅ City created: ${city.name}`, 'green');
      }
    }

    // Step 3: Create Accounts (if they don't exist)
    log('\n📌 Step 3: Creating/checking accounts...', 'blue');
    const accounts = [
      {
        email: 'kamen.georgiev@xnvd.com',
        full_name: 'Камен Георгиев',
        role: 'regional_manager',
        password: 'Kamen123!',
      },
      {
        email: 'krasi.katev@xnvd.com',
        full_name: 'Краси Кътев',
        role: 'office_manager',
        password: 'Krasi123!',
      },
      {
        email: 'georgi.penev@xnvd.com',
        full_name: 'Георги Пенев',
        role: 'team_leader',
        password: 'Georgi123!',
      },
      {
        email: 'lazar.bundev@xnvd.com',
        full_name: 'Лазар Бундев',
        role: 'team_leader',
        password: 'Lazar123!',
      },
    ];

    const accountMap = {};
    for (const account of accounts) {
      // Check if user exists in auth
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(u => u.email === account.email);

      let userId;
      if (existingAuthUser) {
        userId = existingAuthUser.id;
        log(`✅ Auth user exists: ${account.email}`, 'green');
      } else {
        // Create auth user
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.full_name,
          },
        });

        if (authError) {
          log(`❌ Error creating auth user ${account.email}: ${authError.message}`, 'red');
          // Continue with next account
          continue;
        }

        userId = newUser.user.id;
        log(`✅ Auth user created: ${account.email}`, 'green');
      }

      // Check/create profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: account.email,
            full_name: account.full_name,
          });

        if (profileError) {
          log(`⚠️  Error creating profile for ${account.email}: ${profileError.message}`, 'yellow');
        } else {
          log(`✅ Profile created: ${account.full_name}`, 'green');
        }
      }

      // Check/create role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', account.role)
        .single();

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: account.role,
          });

        if (roleError) {
          log(`⚠️  Error creating role for ${account.email}: ${roleError.message}`, 'yellow');
        } else {
          log(`✅ Role assigned: ${account.full_name} → ${account.role}`, 'green');
        }
      } else {
        log(`✅ Role already exists: ${account.full_name} → ${account.role}`, 'green');
      }

      accountMap[account.email] = { userId, role: account.role };
    }

    // Step 4: Set up regional managers for cities
    log('\n📌 Step 4: Setting up regional managers...', 'blue');
    
    // Камен Георгиев - regional manager for Пловдив and Бургас
    const kamenId = accountMap['kamen.georgiev@xnvd.com']?.userId;
    if (kamenId) {
      // Set manager for Пловдив
      const { error: plovdivError } = await supabase
        .from('cities')
        .update({ manager_id: kamenId })
        .eq('id', cityMap['Пловдив']);

      if (plovdivError) {
        log(`⚠️  Error setting manager for Пловдив: ${plovdivError.message}`, 'yellow');
      } else {
        log('✅ Камен Георгиев set as manager for Пловдив', 'green');
      }

      // Set manager for Бургас
      const { error: burgasError } = await supabase
        .from('cities')
        .update({ manager_id: kamenId })
        .eq('id', cityMap['Бургас']);

      if (burgasError) {
        log(`⚠️  Error setting manager for Бургас: ${burgasError.message}`, 'yellow');
      } else {
        log('✅ Камен Георгиев set as manager for Бургас', 'green');
      }
    }

    // Краси Кътев - office manager for Бургас office (will be set after office creation)

    // Step 5: Create Offices
    log('\n📌 Step 5: Creating offices...', 'blue');
    const offices = [
      {
        name: 'Офис Бургас',
        cityId: cityMap['Бургас'],
        address: 'ул. Хан Крум 6',
        managerId: accountMap['krasi.katev@xnvd.com']?.userId,
      },
      {
        name: 'Офис Пловдив',
        cityId: cityMap['Пловдив'],
        address: 'Мария Луиза 43',
        managerId: null, // Managed by regional manager
      },
      {
        name: 'Офис София',
        cityId: cityMap['София'],
        address: 'Сребърна 14',
        managerId: null,
      },
    ];

    const officeMap = {};
    for (const office of offices) {
      const { data: existingOffice } = await supabase
        .from('offices')
        .select('id')
        .eq('name', office.name)
        .eq('city_id', office.cityId)
        .single();

      if (existingOffice) {
        officeMap[office.name] = existingOffice.id;
        log(`✅ Office already exists: ${office.name}`, 'green');
        
        // Update manager if needed
        if (office.managerId) {
          const { error: updateError } = await supabase
            .from('offices')
            .update({ manager_id: office.managerId })
            .eq('id', existingOffice.id);

          if (!updateError) {
            log(`✅ Manager updated for ${office.name}`, 'green');
          }
        }
      } else {
        const { data: newOffice, error: officeError } = await supabase
          .from('offices')
          .insert({
            name: office.name,
            city_id: office.cityId,
            address: office.address,
            manager_id: office.managerId,
          })
          .select()
          .single();

        if (officeError) {
          log(`❌ Error creating office ${office.name}: ${officeError.message}`, 'red');
          throw officeError;
        }

        officeMap[office.name] = newOffice.id;
        log(`✅ Office created: ${office.name} (${office.address})`, 'green');
      }
    }

    // Step 6: Create Teams (optional - for team leaders)
    log('\n📌 Step 6: Creating teams...', 'blue');
    
    // Create teams for team leaders
    const teams = [
      {
        name: 'Екип Георги Пенев',
        officeId: officeMap['Офис Бургас'] || officeMap['Офис София'], // Default to first office
        leaderId: accountMap['georgi.penev@xnvd.com']?.userId,
      },
      {
        name: 'Екип Лазар Бундев',
        officeId: officeMap['Офис Бургас'] || officeMap['Офис София'], // Default to first office
        leaderId: accountMap['lazar.bundev@xnvd.com']?.userId,
      },
    ];

    for (const team of teams) {
      if (!team.leaderId) continue;

      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('name', team.name)
        .eq('office_id', team.officeId)
        .single();

      if (existingTeam) {
        log(`✅ Team already exists: ${team.name}`, 'green');
      } else {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: team.name,
            office_id: team.officeId,
            leader_id: team.leaderId,
          })
          .select()
          .single();

        if (teamError) {
          log(`⚠️  Error creating team ${team.name}: ${teamError.message}`, 'yellow');
        } else {
          log(`✅ Team created: ${team.name}`, 'green');
        }
      }
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ Initial Data Creation Complete!', 'green');
    log('='.repeat(60), 'cyan');
    log('');
    log('📋 Created Structure:', 'blue');
    log('   Country: България', 'green');
    log('   Cities: Варна, София, Пловдив, Бургас', 'green');
    log('   Offices:', 'green');
    log('     - Бургас: ул. Хан Крум 6 (Manager: Краси Кътев)', 'green');
    log('     - Пловдив: Мария Луиза 43', 'green');
    log('     - София: Сребърна 14', 'green');
    log('   Accounts:', 'green');
    log('     - Камен Георгиев (regional_manager) - Пловдив, Бургас', 'green');
    log('     - Краси Кътев (office_manager) - Бургас office', 'green');
    log('     - Георги Пенев (team_leader)', 'green');
    log('     - Лазар Бундев (team_leader)', 'green');
    log('');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run
createInitialData().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

