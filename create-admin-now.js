// Скрипт за създаване на админски акаунт - използва публичния ключ
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
    // Премахване на кавички
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ Грешка: Липсват Supabase credentials в .env файла!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Админски данни
const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

async function createAdmin() {
  try {
    console.log('\n=== Създаване на админски акаунт ===\n');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Парола:', ADMIN_PASSWORD);
    console.log('👤 Име:', ADMIN_NAME);
    console.log('\nСъздаване...\n');

    // Опит за създаване на потребител чрез signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          full_name: ADMIN_NAME
        },
        emailRedirectTo: `${SUPABASE_URL.replace('/rest/v1', '')}/auth/callback`
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('⚠ Потребителят вече съществува. Проверявам...');
        
        // Опит за влизане, за да проверим дали потребителят съществува
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });

        if (signInError) {
          console.error('❌ Грешка при влизане:', signInError.message);
          console.log('\n💡 Възможни причини:');
          console.log('   1. Потребителят съществува, но паролата е различна');
          console.log('   2. Email не е потвърден');
          console.log('\n📋 Моля създайте акаунта ръчно в Supabase Dashboard или използвайте create-admin.sql\n');
          process.exit(1);
        }

        console.log('✓ Потребителят съществува и паролата е правилна');
        console.log('⚠ За да добавите админска роля, изпълнете SQL от create-admin.sql\n');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Акаунтът е готов за използване!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📧 Email:', ADMIN_EMAIL);
        console.log('🔑 Парола:', ADMIN_PASSWORD);
        console.log('\n⚠️  ВАЖНО: Трябва да добавите админска роля!');
        console.log('   Изпълнете SQL от create-admin.sql в Supabase SQL Editor\n');
        
        process.exit(0);
      } else {
        throw authError;
      }
    }

    if (!authData.user) {
      throw new Error('Не можах да създам потребителя');
    }

    console.log('✓ Потребител създаден успешно');
    console.log('⚠ Email confirmation може да е необходим');

    // Проверка за профил (трябва да се създаде автоматично от trigger)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (profileData) {
      console.log('✓ Профил създаден успешно');
    } else {
      console.log('⚠ Профилът ще се създаде автоматично от trigger');
    }

    // За добавяне на админска роля трябва SERVICE_ROLE_KEY
    console.log('\n⚠️  ВАЖНО: За да добавите админска роля:');
    console.log('   1. Отидете в Supabase SQL Editor');
    console.log('   2. Изпълнете SQL от create-admin.sql');
    console.log('   3. Или използвайте SERVICE_ROLE_KEY с create-admin.js\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Потребителят е създаден!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Парола:', ADMIN_PASSWORD);
    console.log('👤 Име:', ADMIN_NAME);
    console.log('\n🌐 Влезте на: http://localhost:5174/auth');
    console.log('\n⚠️  След влизане, добавете админска роля чрез SQL!\n');

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    console.log('\n💡 Алтернативен начин:');
    console.log('   1. Създайте акаунта ръчно в Supabase Dashboard');
    console.log('   2. Изпълнете SQL от create-admin.sql\n');
    process.exit(1);
  }
}

createAdmin();

