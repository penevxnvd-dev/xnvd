// Script to create manager accounts using Supabase
// Run this from root directory: node create-managers-accounts.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

// Map environment variables - support multiple naming conventions
const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || 
                             envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Check if using anon key (which won't work for admin operations)
const isAnonKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY && 
                  !SUPABASE_SERVICE_KEY &&
                  envVars.VITE_SUPABASE_PUBLISHABLE_KEY.length > 100;

if (!SUPABASE_URL) {
  console.error('❌ Липсва VITE_SUPABASE_URL в .env файла');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ Липсва SUPABASE_SERVICE_ROLE_KEY');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.error('За да създадете акаунти, трябва Service Role Key.\n');
  console.error('📋 Стъпки:');
  console.error('   1. Отворете: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/api');
  console.error('   2. Скролнете до "Project API keys"');
  console.error('   3. Копирайте "service_role" key (секретен ключ)');
  console.error('   4. Добавете в .env файла:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n');
  console.error('⚠️  Важно: Service Role Key е много чувствителен!');
  console.error('   - Не го споделяйте публично');
  console.error('   - Не го commit-вайте в Git');
  console.error('   - Използвайте го само за административни скриптове\n');
  console.error('📖 Вижте HOW_TO_GET_SERVICE_ROLE_KEY.md за повече информация\n');
  process.exit(1);
}

if (isAnonKey) {
  console.error('\n⚠️  Предупреждение: Използвате anon key вместо service role key!');
  console.error('   Admin операциите няма да работят. Моля използвайте SUPABASE_SERVICE_ROLE_KEY.\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ACCOUNTS = [
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

async function findOrCreateCountry(countryName, code = 'BG') {
  let { data: country } = await supabase
    .from('countries')
    .select('*')
    .eq('name', countryName)
    .single();

  if (!country) {
    const { data: newCountry, error } = await supabase
      .from('countries')
      .insert({ name: countryName, code })
      .select()
      .single();
    
    if (error) throw error;
    country = newCountry;
    console.log(`✓ Създадена държава: ${countryName}`);
  }

  return country;
}

async function findOrCreateCity(cityName, countryId) {
  let { data: city } = await supabase
    .from('cities')
    .select('*')
    .eq('name', cityName)
    .eq('country_id', countryId)
    .single();

  if (!city) {
    const { data: newCity, error } = await supabase
      .from('cities')
      .insert({ name: cityName, country_id: countryId })
      .select()
      .single();
    
    if (error) throw error;
    city = newCity;
    console.log(`✓ Създаден град: ${cityName}`);
  }

  return city;
}

async function findOrCreateOffice(officeName, cityId) {
  let { data: office } = await supabase
    .from('offices')
    .select('*')
    .eq('name', officeName)
    .eq('city_id', cityId)
    .single();

  if (!office) {
    const { data: newOffice, error } = await supabase
      .from('offices')
      .insert({ name: officeName, city_id: cityId })
      .select()
      .single();
    
    if (error) throw error;
    office = newOffice;
    console.log(`✓ Създаден офис: ${officeName}`);
  }

  return office;
}

async function findOrCreateTeam(teamName, officeId) {
  let { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('name', teamName)
    .eq('office_id', officeId)
    .single();

  if (!team) {
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name: teamName, office_id: officeId })
      .select()
      .single();
    
    if (error) throw error;
    team = newTeam;
    console.log(`✓ Създаден екип: ${teamName}`);
  }

  return team;
}

async function createAccount(accountData) {
  try {
    console.log(`\n=== Създаване на акаунт: ${accountData.fullName} ===`);

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: accountData.email,
      password: accountData.password,
      email_confirm: true,
    });

    if (authError && !authError.message.includes('already registered')) {
      // Try to get existing user
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === accountData.email);
      
      if (existingUser) {
        console.log(`⚠️  ${accountData.fullName} вече съществува в auth. Обновяване...`);
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: accountData.password,
        });
        var userId = existingUser.id;
      } else {
        throw authError;
      }
    } else if (authError && authError.message.includes('already registered')) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === accountData.email);
      if (existingUser) {
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, {
          password: accountData.password,
        });
      }
    } else {
      var userId = authData.user.id;
      console.log(`✓ Потребител създаден в auth: ${accountData.email}`);
    }

    // Create or update profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let profileId = userId;

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

    // Handle role-specific setup
    if (accountData.role === 'office_manager') {
      const country = await findOrCreateCountry('България');
      const city = await findOrCreateCity(accountData.city, country.id);
      
      // Find first office in the city or create one
      let { data: offices } = await supabase
        .from('offices')
        .select('*')
        .eq('city_id', city.id)
        .limit(1);

      let office;
      if (offices && offices.length > 0) {
        office = offices[0];
      } else {
        office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      }

      // Try to set manager_id (might need migration first)
      const { error: updateError } = await supabase
        .from('offices')
        .update({ manager_id: profileId })
        .eq('id', office.id);

      if (updateError && updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        console.log(`⚠️  Колоната manager_id все още не съществува. Моля приложете миграцията първо.`);
      } else if (updateError) {
        console.warn(`⚠️  Грешка при обновяване на manager_id: ${updateError.message}`);
      } else {
        console.log(`✓ Назначен като мениджър на офис: ${office.name}`);
      }

    } else if (accountData.role === 'team_leader') {
      const country = await findOrCreateCountry('България');
      const city = await findOrCreateCity(accountData.city, country.id);
      
      // Find first office in the city
      let { data: offices } = await supabase
        .from('offices')
        .select('*')
        .eq('city_id', city.id)
        .limit(1);

      let office;
      if (offices && offices.length > 0) {
        office = offices[0];
      } else {
        office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      }

      // Find or create team
      let team;
      if (accountData.teamName) {
        team = await findOrCreateTeam(accountData.teamName, office.id);
      } else {
        // Find existing team without leader
        const { data: existingTeam } = await supabase
          .from('teams')
          .select('*')
          .eq('office_id', office.id)
          .is('leader_id', null)
          .limit(1)
          .single();

        if (existingTeam) {
          team = existingTeam;
        } else {
          team = await findOrCreateTeam(accountData.fullName, office.id);
        }
      }

      // Set leader_id on team
      const { error: updateError } = await supabase
        .from('teams')
        .update({ leader_id: profileId })
        .eq('id', team.id);

      if (updateError) throw updateError;
      console.log(`✓ Назначен като ръководител на екип: ${team.name}`);

    } else if (accountData.role === 'regional_manager') {
      const country = await findOrCreateCountry('България');
      
      // Set manager_id on cities
      for (const cityName of accountData.cities) {
        const city = await findOrCreateCity(cityName, country.id);
        
        // Try to update manager_id (might need migration first)
        const { error: updateError } = await supabase
          .from('cities')
          .update({ manager_id: profileId })
          .eq('id', city.id);

        if (updateError && updateError.message.includes('column') && updateError.message.includes('does not exist')) {
          console.log(`⚠️  Колоната manager_id все още не съществува за cities. Моля приложете миграцията първо.`);
        } else if (updateError) {
          console.warn(`⚠️  Грешка при обновяване на manager_id за ${cityName}: ${updateError.message}`);
        } else {
          console.log(`✓ Назначен като регионален мениджър на град: ${cityName}`);
        }
      }
    }

    // Create role in user_roles (using raw SQL to handle enum)
    const { error: roleError } = await supabase.rpc('exec_sql', {
      sql: `INSERT INTO user_roles (user_id, role) VALUES ('${profileId}', '${accountData.role}'::app_role) ON CONFLICT (user_id, role) DO NOTHING`
    }).catch(async () => {
      // If RPC doesn't exist, try direct insert
      return await supabase
        .from('user_roles')
        .insert({
          user_id: profileId,
          role: accountData.role,
        });
    });

    if (roleError) {
      if (roleError.message.includes('invalid input value') || roleError.message.includes('does not exist')) {
        console.warn(`⚠️  Ролята "${accountData.role}" все още не е в enum. Моля приложете миграцията първо.`);
      } else if (!roleError.message.includes('duplicate') && !roleError.message.includes('unique constraint')) {
        // Try with raw SQL
        const { error: sqlError } = await supabase
          .from('user_roles')
          .insert({
            user_id: profileId,
            role: accountData.role,
          });
        
        if (sqlError && !sqlError.message.includes('duplicate') && !sqlError.message.includes('unique constraint')) {
          console.warn(`⚠️  Грешка при добавяне на роля: ${sqlError.message}`);
        } else {
          console.log(`✓ Роля "${accountData.role}" добавена`);
        }
      } else {
        console.log(`✓ Роля "${accountData.role}" вече съществува`);
      }
    } else {
      console.log(`✓ Роля "${accountData.role}" добавена`);
    }

    console.log(`✅ ${accountData.fullName} готов!`);
    console.log(`   Email: ${accountData.email}`);
    console.log(`   Парола: ${accountData.password}`);
    console.log(`   Роля: ${accountData.role}`);

  } catch (error) {
    console.error(`❌ Грешка при създаване на ${accountData.fullName}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Създаване на мениджърски и ръководни акаунти');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create all accounts
    for (const account of ACCOUNTS) {
      await createAccount(account);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Всички акаунти са създадени успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 СЪЗДАДЕНИ АКАУНТИ:');
    ACCOUNTS.forEach((acc, index) => {
      console.log(`\n${index + 1}. ${acc.fullName}`);
      console.log(`   📧 Email: ${acc.email}`);
      console.log(`   🔑 Парола: ${acc.password}`);
      console.log(`   👔 Роля: ${acc.role}`);
      if (acc.role === 'office_manager') {
        console.log(`   🏢 Град: ${acc.city}`);
      } else if (acc.role === 'team_leader') {
        console.log(`   👥 Град: ${acc.city}`);
        if (acc.teamName) {
          console.log(`   🎯 Екип: ${acc.teamName}`);
        }
      } else if (acc.role === 'regional_manager') {
        console.log(`   🌍 Градове: ${acc.cities.join(', ')}`);
      }
    });

    console.log('\n⚠️  ВАЖНО:');
    console.log('   Моля приложете миграцията за regional_manager ролята:');
    console.log('   supabase/migrations/20251206000001_add_regional_manager.sql');
    console.log('   в Supabase SQL Editor\n');

    console.log('🌐 Влезте на: https://xnvd.vercel.app/auth\n');

  } catch (error) {
    console.error('\n❌ Фатална грешка:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Фатална грешка:', error);
    process.exit(1);
  });

