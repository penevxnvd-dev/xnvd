// Скрипт за създаване на админски акаунт
import { createClient } from '@supabase/supabase-js';

// Админски данни
const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

// Четене на environment variables или задаване директно
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function createAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\n❌ Грешка: Липсват Supabase credentials!\n');
    console.log('Моля задайте environment variables:');
    console.log('export VITE_SUPABASE_URL="your-supabase-url"');
    console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
    console.log('\nИли редактирайте този файл и задайте стойностите директно.\n');
    console.log('За да намерите тези стойности:');
    console.log('1. Отидете в Supabase Dashboard');
    console.log('2. Settings > API');
    console.log('3. Project URL = VITE_SUPABASE_URL');
    console.log('4. service_role key (секретен) = SUPABASE_SERVICE_ROLE_KEY\n');
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
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Парола:', ADMIN_PASSWORD);
    console.log('👤 Име:', ADMIN_NAME);
    console.log('\nСъздаване...\n');

    // Проверка дали потребителят вече съществува
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

    let userId;

    if (existingUser) {
      console.log('⚠ Потребителят вече съществува. Използвам съществуващия акаунт...');
      userId = existingUser.id;
    } else {
      // Създаване на нов потребител
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_NAME
        }
      });

      if (authError) {
        throw authError;
      }

      userId = authData.user.id;
      console.log('✓ Потребител създаден успешно');
    }

    // Проверка/създаване на профил
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

      if (profileError && !profileError.message.includes('duplicate')) {
        console.log('⚠ Грешка при създаване на профил:', profileError.message);
      } else {
        console.log('✓ Профил създаден/обновен успешно');
      }
    } else {
      console.log('✓ Профил вече съществува');
    }

    // Проверка/добавяне на админска роля
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        });

      if (roleError) {
        throw roleError;
      }
      console.log('✓ Админска роля добавена успешно');
    } else {
      console.log('✓ Админската роля вече съществува');
    }

    console.log('\n=== ✅ Акаунтът е готов! ===\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', ADMIN_EMAIL);
    console.log('🔑 Парола:   ', ADMIN_PASSWORD);
    console.log('👤 Име:      ', ADMIN_NAME);
    console.log('👑 Роля:     admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Можете да влезете в приложението на:');
    console.log('   http://localhost:5174/auth\n');

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    if (error.message.includes('JWT') || error.message.includes('Invalid API key')) {
      console.log('\n⚠ Уверете се, че използвате SERVICE_ROLE_KEY, а не анонимен ключ!');
      console.log('   SERVICE_ROLE_KEY се намира в Supabase Dashboard > Settings > API\n');
    }
    process.exit(1);
  }
}

createAdmin();
