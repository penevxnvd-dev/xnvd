// Complete script to create manager accounts
// This script will create auth users if service role key is available,
// otherwise it will provide instructions for manual creation

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Създаване на мениджърски акаунти');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Read .env
const envPath = '.env';
if (!existsSync(envPath)) {
  console.error('❌ .env файлът не съществува');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || 
                             envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Липсва VITE_SUPABASE_URL в .env файла');
  process.exit(1);
}

const accounts = [
  {
    email: 'krasi.katev@xnvd.com',
    password: 'Krasi123!',
    fullName: 'Краси Кътев',
    role: 'office_manager',
    city: 'Бургас',
  },
  {
    email: 'lazar.bundev@xnvd.com',
    password: 'Lazar123!',
    fullName: 'Лазар Бундев',
    role: 'team_leader',
    city: 'Бургас',
    teamName: 'Лазар Бундев',
  },
  {
    email: 'georgi.penev@xnvd.com',
    password: 'Georgi123!',
    fullName: 'Георги Пенев',
    role: 'team_leader',
    city: 'Бургас',
    teamName: 'Георги Пенев',
  },
  {
    email: 'kamen.georgiev@xnvd.com',
    password: 'Kamen123!',
    fullName: 'Камен Георгиев',
    role: 'regional_manager',
    cities: ['Бургас', 'Пловдив'],
  },
];

if (!SUPABASE_SERVICE_KEY) {
  console.log('⚠️  Service Role Key не е намерен в .env');
  console.log('\n📋 Инструкции за ръчно създаване:\n');
  console.log('1. Отворете: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/auth/users');
  console.log('2. Създайте следните потребители:\n');
  
  accounts.forEach(acc => {
    console.log(`   Email: ${acc.email}`);
    console.log(`   Password: ${acc.password}`);
    console.log(`   Name: ${acc.fullName}`);
    console.log(`   Role: ${acc.role}`);
    console.log('');
  });
  
  console.log('3. След като създадете auth users, изпълнете SQL скрипта:');
  console.log('   node create-accounts-via-sql.js\n');
  console.log('   Или изпълнете create-accounts-via-sql.sql в Supabase SQL Editor\n');
  process.exit(0);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findOrCreateCountry(name, code = 'BG') {
  let { data: country } = await supabase
    .from('countries')
    .select('*')
    .eq('name', name)
    .single();

  if (!country) {
    const { data: newCountry, error } = await supabase
      .from('countries')
      .insert({ name, code })
      .select()
      .single();
    
    if (error) throw error;
    country = newCountry;
  }

  return country;
}

async function findOrCreateCity(name, countryId) {
  let { data: city } = await supabase
    .from('cities')
    .select('*')
    .eq('name', name)
    .eq('country_id', countryId)
    .single();

  if (!city) {
    const { data: newCity, error } = await supabase
      .from('cities')
      .insert({ name, country_id: countryId })
      .select()
      .single();
    
    if (error) throw error;
    city = newCity;
  }

  return city;
}

async function findOrCreateOffice(name, cityId) {
  let { data: office } = await supabase
    .from('offices')
    .select('*')
    .eq('name', name)
    .eq('city_id', cityId)
    .single();

  if (!office) {
    const { data: newOffice, error } = await supabase
      .from('offices')
      .insert({ name, city_id: cityId })
      .select()
      .single();
    
    if (error) throw error;
    office = newOffice;
  }

  return office;
}

async function findOrCreateTeam(name, officeId, leaderId = null) {
  let { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('name', name)
    .eq('office_id', officeId)
    .single();

  if (!team) {
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name, office_id: officeId, leader_id: leaderId })
      .select()
      .single();
    
    if (error) throw error;
    team = newTeam;
  } else if (leaderId) {
    await supabase
      .from('teams')
      .update({ leader_id: leaderId })
      .eq('id', team.id);
  }

  return team;
}

async function createAccount(accountData) {
  try {
    console.log(`\n=== Създаване на акаунт: ${accountData.fullName} ===`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: accountData.email,
      password: accountData.password,
      email_confirm: true,
      user_metadata: {
        full_name: accountData.fullName,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  ${accountData.email} вече съществува. Обновяване...`);
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === accountData.email);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            password: accountData.password,
            user_metadata: { full_name: accountData.fullName },
          });
          var userId = existingUser.id;
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    } else {
      var userId = authData.user.id;
      console.log(`✓ Auth потребител създаден: ${accountData.email}`);
    }

    // Create or update profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      await supabase
        .from('profiles')
        .update({ full_name: accountData.fullName, email: accountData.email })
        .eq('id', userId);
      console.log(`✓ Профил обновен`);
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: accountData.email,
          full_name: accountData.fullName,
        });

      if (profileError) throw profileError;
      console.log(`✓ Профил създаден`);
    }

    // Create role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: accountData.role,
      })
      .select();

    if (roleError && !roleError.message.includes('duplicate')) {
      throw roleError;
    }
    console.log(`✓ Роля зададена: ${accountData.role}`);

    // Handle role-specific setup
    if (accountData.role === 'office_manager') {
      const country = await findOrCreateCountry('България');
      const city = await findOrCreateCity(accountData.city, country.id);
      const office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      
      await supabase
        .from('offices')
        .update({ manager_id: userId })
        .eq('id', office.id);
      
      console.log(`✓ Назначен като Office Manager на: ${office.name}`);

    } else if (accountData.role === 'team_leader') {
      const country = await findOrCreateCountry('България');
      const city = await findOrCreateCity(accountData.city, country.id);
      const office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      const team = await findOrCreateTeam(accountData.teamName || accountData.fullName, office.id, userId);
      
      console.log(`✓ Назначен като Team Leader на: ${team.name}`);

    } else if (accountData.role === 'regional_manager') {
      const country = await findOrCreateCountry('България');
      
      for (const cityName of accountData.cities) {
        const city = await findOrCreateCity(cityName, country.id);
        await supabase
          .from('cities')
          .update({ manager_id: userId })
          .eq('id', city.id);
        console.log(`✓ Назначен като Regional Manager на: ${cityName}`);
      }
    }

    console.log(`✅ ${accountData.fullName} - Готово!\n`);

  } catch (error) {
    console.error(`❌ Грешка при създаване на ${accountData.fullName}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    for (const account of accounts) {
      await createAccount(account);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Всички акаунти са създадени успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Създадени акаунти:');
    accounts.forEach(acc => {
      console.log(`   ${acc.fullName} (${acc.email}) - ${acc.role}`);
    });
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Фатална грешка:', error.message);
    process.exit(1);
  }
}

main();

