// Опростен скрипт за създаване на админски акаунт
import { createClient } from '@supabase/supabase-js';

// Задайте вашите Supabase credentials тук или използвайте environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

// Админски данни - променете ги според нуждите
const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

async function createAdmin() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('\n❌ Грешка: Моля задайте VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
    console.log('\nМожете да ги зададете като:');
    console.log('export VITE_SUPABASE_URL="your-url"');
    console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    console.log('\nИли редактирайте файла и задайте стойностите директно.\n');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('\n=== Създаване на админски акаунт ===\n');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Парола:', ADMIN_PASSWORD);
    console.log('Име:', ADMIN_NAME);
    console.log('\nСъздаване...\n');

    // Създаване на потребител
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠ Потребителят вече съществува. Проверявам ролята...');
      } else {
        throw authError;
      }
    } else {
      console.log('✓ Потребител създаден успешно');
    }

    const userId = authData?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === ADMIN_EMAIL)?.id;

    if (!userId) {
      throw new Error('Не можах да намеря потребителския ID');
    }

    // Проверка за профил
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profileData) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: ADMIN_NAME,
          email: ADMIN_EMAIL
        });

      if (profileError) {
        console.log('⚠ Грешка при създаване на профил (може да е създаден автоматично):', profileError.message);
      } else {
        console.log('✓ Профил създаден успешно');
      }
    } else {
      console.log('✓ Профил вече съществува');
    }

    // Добавяне на админска роля
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin'
      });

    if (roleError) {
      if (roleError.code === '23505') {
        console.log('✓ Админската роля вече съществува');
      } else {
        throw roleError;
      }
    } else {
      console.log('✓ Админска роля добавена успешно');
    }

    console.log('\n=== ✅ Акаунтът е готов! ===\n');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Парола:', ADMIN_PASSWORD);
    console.log('👤 Име:', ADMIN_NAME);
    console.log('👑 Роля: admin');
    console.log('\nМожете да влезете в приложението на http://localhost:5174/auth\n');

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    if (error.message.includes('JWT')) {
      console.log('\n⚠ Уверете се, че използвате SERVICE_ROLE_KEY, а не анонимен ключ!');
    }
    process.exit(1);
  }
}

createAdmin();

