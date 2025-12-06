// Test login for manager accounts
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔐 Тест на влизане');
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
                     envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Липсват Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testAccounts = [
  { email: 'krasi.katev@xnvd.com', password: 'Krasi123!', name: 'Краси Кътев' },
  { email: 'lazar.bundev@xnvd.com', password: 'Lazar123!', name: 'Лазар Бундев' },
  { email: 'georgi.penev@xnvd.com', password: 'Georgi123!', name: 'Георги Пенев' },
  { email: 'kamen.georgiev@xnvd.com', password: 'Kamen123!', name: 'Камен Георгиев' },
];

async function testLogin(account) {
  try {
    console.log(`\n🔍 Тестване на: ${account.name} (${account.email})`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (error) {
      console.error(`   ❌ Грешка: ${error.message}`);
      console.error(`   Код: ${error.status || 'N/A'}`);
      return false;
    }

    if (data.user) {
      console.log(`   ✅ Влизането е успешно!`);
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Да' : 'Не'}`);
      
      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error(`   ⚠️  Грешка при зареждане на профил: ${profileError.message}`);
      } else {
        console.log(`   ✅ Профил намерен: ${profile.full_name}`);
      }

      // Check role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      if (rolesError) {
        console.error(`   ⚠️  Грешка при зареждане на роли: ${rolesError.message}`);
      } else if (roles && roles.length > 0) {
        console.log(`   ✅ Роли: ${roles.map(r => r.role).join(', ')}`);
      }

      // Sign out
      await supabase.auth.signOut();
      return true;
    }

    return false;
  } catch (error) {
    console.error(`   ❌ Неочаквана грешка: ${error.message}`);
    return false;
  }
}

async function main() {
  let successCount = 0;
  let failCount = 0;

  for (const account of testAccounts) {
    const success = await testLogin(account);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Резултати: ${successCount} успешни, ${failCount} неуспешни`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failCount > 0) {
    console.log('💡 Ако има проблеми:');
    console.log('   1. Проверете дали паролите са правилни');
    console.log('   2. Проверете дали email адресите са правилни');
    console.log('   3. Проверете дали акаунтите са потвърдени в Supabase Dashboard\n');
    process.exit(1);
  }
}

main();

