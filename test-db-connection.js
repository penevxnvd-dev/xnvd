// Test script to verify database connection
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 Тест на връзката с базата данни');
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
const SUPABASE_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     envVars.VITE_SUPABASE_ANON_KEY ||
                     envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Липсват Supabase credentials в .env файла');
  console.error('   Нужни са: VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

console.log('✅ Credentials намерени');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: ${SUPABASE_KEY.substring(0, 20)}...\n`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    console.log('🔍 Тестване на връзката...\n');

    // Test 1: Check countries
    console.log('1. Проверка на countries...');
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('id, name, code')
      .limit(5);

    if (countriesError) throw countriesError;
    console.log(`   ✅ Намерени ${countries?.length || 0} държави`);
    if (countries && countries.length > 0) {
      countries.forEach(c => console.log(`      - ${c.name} (${c.code})`));
    }

    // Test 2: Check cities
    console.log('\n2. Проверка на cities...');
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name')
      .limit(5);

    if (citiesError) throw citiesError;
    console.log(`   ✅ Намерени ${cities?.length || 0} града`);
    if (cities && cities.length > 0) {
      cities.forEach(c => console.log(`      - ${c.name}`));
    }

    // Test 3: Check profiles
    console.log('\n3. Проверка на profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(5);

    if (profilesError) throw profilesError;
    console.log(`   ✅ Намерени ${profiles?.length || 0} профила`);
    if (profiles && profiles.length > 0) {
      profiles.forEach(p => console.log(`      - ${p.full_name} (${p.email})`));
    }

    // Test 4: Check user_roles
    console.log('\n4. Проверка на user_roles...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .limit(10);

    if (rolesError) throw rolesError;
    console.log(`   ✅ Намерени ${roles?.length || 0} роли`);
    if (roles && roles.length > 0) {
      const roleCounts = {};
      roles.forEach(r => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`      - ${role}: ${count}`);
      });
    }

    // Test 5: Check teams
    console.log('\n5. Проверка на teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .limit(5);

    if (teamsError) throw teamsError;
    console.log(`   ✅ Намерени ${teams?.length || 0} екипа`);
    if (teams && teams.length > 0) {
      teams.forEach(t => console.log(`      - ${t.name}`));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Връзката с базата данни работи отлично!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Грешка при тестване на връзката:', error.message);
    if (error.message.includes('JWT')) {
      console.error('\n💡 Проверете дали VITE_SUPABASE_PUBLISHABLE_KEY е правилен');
    } else if (error.message.includes('Failed to fetch')) {
      console.error('\n💡 Проверете дали VITE_SUPABASE_URL е правилен и интернет връзката');
    }
    process.exit(1);
  }
}

testConnection();

