// Script to apply Supabase migration via Management API
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env file
const envPath = join(process.cwd(), '.env');
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
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || 
                             envVars.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                             envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Липсва VITE_SUPABASE_URL в .env файла');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Липсва Supabase key в .env файла');
  process.exit(1);
}

// Read migration file
const migrationPath = join(process.cwd(), 'apply-supabase-migrations.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Прилагане на миграция в Supabase');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
console.log(`📝 Миграция: apply-supabase-migrations.sql`);
console.log(`📏 Размер: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Не мога да извлека project reference от URL');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('⏳ Прилагане на миграция чрез Supabase Management API...\n');

    // Use Supabase Management API to execute SQL
    // Note: This requires a service role key with proper permissions
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        query: migrationSQL,
      }),
    });

    if (!response.ok) {
      // Try alternative: Direct SQL execution via PostgREST
      console.log('⚠️  Management API не е достъпен, опитвам алтернативен метод...\n');
      
      // Alternative: Execute via PostgREST SQL endpoint (if available)
      const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ sql: migrationSQL }),
      });

      if (!altResponse.ok) {
        const errorText = await altResponse.text();
        throw new Error(`API Error: ${altResponse.status} - ${errorText}`);
      }

      console.log('✅ Миграцията е изпратена чрез алтернативен метод');
    } else {
      const result = await response.json();
      console.log('✅ Миграцията е изпратена чрез Management API');
      if (result.error) {
        console.warn('⚠️  Предупреждение:', result.error);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Миграцията е изпратена успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Важно:');
    console.log('   Supabase не позволява директно изпълнение на SQL чрез стандартния API.');
    console.log('   За да приложите миграцията, използвайте един от следните методи:\n');
    console.log('   Метод 1: Supabase SQL Editor (Препоръчително)');
    console.log('   1. Отворете: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/sql/new');
    console.log('   2. Копирайте съдържанието от apply-supabase-migrations.sql');
    console.log('   3. Поставете го в SQL Editor и изпълнете\n');
    console.log('   Метод 2: Supabase CLI');
    console.log('   supabase db push\n');

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    console.error('\n💡 Решение:');
    console.error('   Supabase не позволява директно изпълнение на SQL чрез API.');
    console.error('   Моля приложете миграцията ръчно:');
    console.error('   1. Отворете: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/sql/new');
    console.error('   2. Копирайте съдържанието от apply-supabase-migrations.sql');
    console.error('   3. Поставете го в SQL Editor и изпълнете\n');
    process.exit(1);
  }
}

applyMigration()
  .then(() => {
    console.log('📋 Следващи стъпки:');
    console.log('   1. Проверете резултата в Supabase Dashboard');
    console.log('   2. Изпълнете create-managers-accounts.sql за създаване на акаунти');
    console.log('   3. Тествайте функционалността с различни роли\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });

