// Скрипт за добавяне на админска роля
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Четене на .env файла
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ Грешка: Липсват Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = 'admin@xnvd.com';

async function addAdminRole() {
  try {
    console.log('\n=== Добавяне на админска роля ===\n');

    // Първо влизаме като потребителя, за да получим user_id
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: 'Admin123!'
    });

    if (signInError) {
      console.error('❌ Грешка при влизане:', signInError.message);
      console.log('\n💡 Уверете се, че:');
      console.log('   1. Потребителят е създаден');
      console.log('   2. Email е потвърден (ако е необходимо)');
      console.log('   3. Паролата е правилна\n');
      process.exit(1);
    }

    const userId = signInData.user.id;
    console.log('✓ Влязохме успешно');
    console.log('✓ User ID:', userId);

    // Опит за добавяне на роля (може да не работи заради RLS)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin'
      })
      .select();

    if (roleError) {
      if (roleError.code === '42501' || roleError.message.includes('permission') || roleError.message.includes('policy')) {
        console.log('\n⚠ Не мога да добавя ролята автоматично заради RLS политиките.');
        console.log('📋 Моля изпълнете SQL от create-admin.sql в Supabase SQL Editor\n');
        console.log('Или използвайте SERVICE_ROLE_KEY с create-admin.js\n');
      } else if (roleError.code === '23505') {
        console.log('✓ Админската роля вече съществува!');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Акаунтът е готов!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📧 Email: admin@xnvd.com');
        console.log('🔑 Парола: Admin123!');
        console.log('👑 Роля: admin');
        console.log('\n🌐 Влезте на: http://localhost:5174/auth\n');
        process.exit(0);
      } else {
        throw roleError;
      }
    } else {
      console.log('✓ Админска роля добавена успешно!');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Акаунтът е готов!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📧 Email: admin@xnvd.com');
      console.log('🔑 Парола: Admin123!');
      console.log('👑 Роля: admin');
      console.log('\n🌐 Влезте на: http://localhost:5174/auth\n');
    }

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    console.log('\n📋 Моля изпълнете SQL от create-admin.sql в Supabase SQL Editor\n');
    process.exit(1);
  }
}

addAdminRole();

