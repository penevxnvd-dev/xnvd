// Скрипт за създаване на потребител в Supabase Auth
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const EMAIL = 'g.kalushev@xnvd.bg';
const PASSWORD = 'Georgi123!';
const FULL_NAME = 'Георги Калушев';

async function createSupabaseUser() {
  try {
    console.log('\n=== Създаване на потребител в Supabase Auth ===\n');
    console.log('📧 Email:', EMAIL);
    console.log('👤 Име:', FULL_NAME);
    console.log('🔑 Парола:', PASSWORD);
    console.log('\nСъздаване...\n');

    // Проверка дали потребителят вече съществува
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Грешка при проверка на потребители:', listError);
      return;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === EMAIL);
    
    if (existingUser) {
      console.log('⚠️  Потребителят вече съществува в Supabase Auth');
      console.log('   ID:', existingUser.id);
      
      // Обновяване на паролата
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: PASSWORD }
      );
      
      if (updateError) {
        console.error('Грешка при обновяване на парола:', updateError);
      } else {
        console.log('✅ Паролата е обновена');
      }
    } else {
      // Създаване на нов потребител
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: FULL_NAME
        }
      });

      if (createError) {
        console.error('❌ Грешка при създаване:', createError);
        return;
      }

      console.log('✅ Потребител създаден в Supabase Auth');
      console.log('   ID:', newUser.user.id);
    }

    console.log('\n✅ Готово!');
    console.log('\nМожете да влезете с:');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Парола: ${PASSWORD}`);

  } catch (error) {
    console.error('❌ Грешка:', error);
    throw error;
  }
}

createSupabaseUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Фатална грешка:', error);
    process.exit(1);
  });

