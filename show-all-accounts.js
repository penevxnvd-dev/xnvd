import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Липсват необходимите environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function showAllAccounts() {
  try {
    console.log('\n📋 Зареждане на всички акаунти...\n');

    // Get all profiles with their roles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        created_at,
        user_roles (role)
      `)
      .order('full_name', { ascending: true });

    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      console.log('❌ Няма намерени акаунти в базата данни.\n');
      return;
    }

    console.log(`✅ Намерени ${profiles.length} акаунта:\n`);
    console.log('═'.repeat(100));
    console.log(
      'Име'.padEnd(30) +
      'Email'.padEnd(35) +
      'Роля'.padEnd(20) +
      'Дата на създаване'
    );
    console.log('═'.repeat(100));

    profiles.forEach((profile, index) => {
      const role = profile.user_roles?.[0]?.role || 'Няма роля';
      const roleDisplay = 
        role === 'admin' ? 'Администратор' :
        role === 'realtor' ? 'Реализатор' :
        role === 'regional_manager' ? 'Регионален мениджър' :
        role === 'office_manager' ? 'Офис мениджър' :
        role === 'team_leader' ? 'Лидер на екип' :
        role;

      const createdAt = profile.created_at 
        ? new Date(profile.created_at).toLocaleDateString('bg-BG')
        : 'Няма дата';

      console.log(
        (profile.full_name || 'Без име').padEnd(30) +
        (profile.email || 'Няма email').padEnd(35) +
        roleDisplay.padEnd(20) +
        createdAt
      );
    });

    console.log('═'.repeat(100));
    console.log(`\n📊 Общо: ${profiles.length} акаунта\n`);

    // Group by role
    const roleCounts = {};
    profiles.forEach(profile => {
      const role = profile.user_roles?.[0]?.role || 'Няма роля';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    console.log('📈 Разпределение по роли:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const roleDisplay = 
        role === 'admin' ? 'Администратор' :
        role === 'realtor' ? 'Реализатор' :
        role === 'regional_manager' ? 'Регионален мениджър' :
        role === 'office_manager' ? 'Офис мениджър' :
        role === 'team_leader' ? 'Лидер на екип' :
        role;
      console.log(`   ${roleDisplay}: ${count}`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    if (error.message.includes('JWT') || error.message.includes('Invalid API key')) {
      console.log('\n⚠ Уверете се, че използвате SERVICE_ROLE_KEY, а не анонимен ключ!');
      console.log('   SERVICE_ROLE_KEY се намира в Supabase Dashboard > Settings > API\n');
    }
    process.exit(1);
  }
}

showAllAccounts();

