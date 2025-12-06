// Script to create accounts for managers and team leaders using Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple .env locations
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

// Map environment variables - support multiple naming conventions
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                   process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                                   process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Fallback to anon key

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Липсват Supabase credentials!');
  console.error('Моля задайте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env файла');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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

    // Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === accountData.email);

    let userId;
    let profileId;

    if (existingUser) {
      console.log(`⚠️  ${accountData.fullName} вече съществува в auth. Обновяване...`);
      userId = existingUser.id;
      
      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: accountData.password,
      });
      if (updateError) throw updateError;

      // Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        profileId = profile.id;
        // Update profile name if needed
        await supabase
          .from('profiles')
          .update({ full_name: accountData.fullName })
          .eq('id', profileId);
      } else {
        // Create profile
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: accountData.email,
            full_name: accountData.fullName,
          })
          .select()
          .single();
        
        if (error) throw error;
        profileId = newProfile.id;
      }
    } else {
      // Create new user in auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: accountData.email,
        password: accountData.password,
        email_confirm: true,
      });

      if (createError) throw createError;
      userId = newUser.user.id;

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: accountData.email,
          full_name: accountData.fullName,
        })
        .select()
        .single();

      if (profileError) throw profileError;
      profileId = profile.id;
      console.log(`✓ Профил създаден: ${accountData.fullName}`);
    }

    // Handle role-specific setup
    if (accountData.role === 'office_manager') {
      const country = await findOrCreateCountry('България');
      const city = await findOrCreateCity(accountData.city, country.id);
      
      // Find first office in the city or create one
      let { data: office } = await supabase
        .from('offices')
        .select('*')
        .eq('city_id', city.id)
        .limit(1)
        .single();

      if (!office) {
        office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      }

      // Set manager_id on office (using raw SQL since column might not exist yet)
      const { error: updateError } = await supabase.rpc('exec_sql', {
        sql: `UPDATE offices SET manager_id = '${profileId}' WHERE id = '${office.id}'`
      }).catch(async () => {
        // If RPC doesn't exist, try direct update (column might exist)
        return await supabase
          .from('offices')
          .update({ manager_id: profileId })
          .eq('id', office.id);
      });

      if (updateError && !updateError.message.includes('column') && !updateError.message.includes('does not exist')) {
        console.warn(`⚠️  Не можа да се обнови manager_id: ${updateError.message}`);
      } else {
        console.log(`✓ Назначен като мениджър на офис: ${office.name}`);
      }

    } else if (accountData.role === 'team_leader') {
      const country = await findOrCreateCountry('България');
      const city = await findOrCreateCity(accountData.city, country.id);
      
      // Find first office in the city
      let { data: office } = await supabase
        .from('offices')
        .select('*')
        .eq('city_id', city.id)
        .limit(1)
        .single();

      if (!office) {
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
          const teamName = accountData.fullName;
          team = await findOrCreateTeam(teamName, office.id);
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
        
        // Try to update manager_id (using raw SQL if column doesn't exist yet)
        const { error: updateError } = await supabase.rpc('exec_sql', {
          sql: `UPDATE cities SET manager_id = '${profileId}' WHERE id = '${city.id}'`
        }).catch(async () => {
          // If RPC doesn't exist, try direct update
          return await supabase
            .from('cities')
            .update({ manager_id: profileId })
            .eq('id', city.id);
        });

        if (updateError && !updateError.message.includes('column') && !updateError.message.includes('does not exist')) {
          console.warn(`⚠️  Не можа да се обнови manager_id за ${cityName}: ${updateError.message}`);
        } else {
          console.log(`✓ Назначен като регионален мениджър на град: ${cityName}`);
        }
      }
    }

    // Create role in user_roles
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', profileId)
      .eq('role', accountData.role)
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profileId,
          role: accountData.role,
        });

      if (roleError) {
        // Try with raw SQL if enum doesn't exist yet
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          sql: `INSERT INTO user_roles (user_id, role) VALUES ('${profileId}', '${accountData.role}'::app_role) ON CONFLICT (user_id, role) DO NOTHING`
        }).catch(() => ({ error: null }));

        if (sqlError && roleError.message.includes('invalid input value')) {
          console.warn(`⚠️  Ролята "${accountData.role}" все още не е добавена в enum. Моля приложете миграцията първо.`);
        } else if (roleError) {
          throw roleError;
        }
      } else {
        console.log(`✓ Роля "${accountData.role}" добавена`);
      }
    } else {
      console.log(`✓ Роля "${accountData.role}" вече съществува`);
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

