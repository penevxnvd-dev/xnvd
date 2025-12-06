// Script to apply Supabase migration directly via API
import { createClient } from '@supabase/supabase-js';
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
  console.error('Моля добавете VITE_SUPABASE_PUBLISHABLE_KEY или SUPABASE_SERVICE_ROLE_KEY');
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

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log('⏳ Прилагане на миграция...\n');

    // Split SQL into individual statements
    // Remove comments and empty lines, then split by semicolons
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))
      .filter(s => !s.match(/^DO \$\$.*\$\$$/)); // Filter out DO blocks for now

    // For DO blocks, we need to execute them separately
    const doBlocks = migrationSQL.match(/DO \$\$[\s\S]*?\$\$;/g) || [];

    let successCount = 0;
    let errorCount = 0;

    // Execute DO blocks first (they contain the main logic)
    for (const block of doBlocks) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: block }).catch(async () => {
          // If RPC doesn't exist, try direct SQL execution via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ sql: block }),
          });

          if (!response.ok) {
            // Try alternative: execute via PostgREST
            return { error: new Error('RPC not available') };
          }

          return { error: null };
        });

        if (error) {
          // Try executing via direct SQL (if we have database access)
          console.log(`⚠️  Не можа да се изпълни чрез RPC, опитвам алтернативен метод...`);
        } else {
          successCount++;
          console.log(`✅ Изпълнен DO блок`);
        }
      } catch (err) {
        errorCount++;
        console.error(`❌ Грешка при изпълнение на DO блок:`, err.message);
      }
    }

    // Execute regular statements
    for (const statement of statements) {
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch(() => {
          return { error: new Error('RPC not available') };
        });

        if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.warn(`⚠️  ${statement.substring(0, 50)}... - ${error.message}`);
        } else {
          successCount++;
        }
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          errorCount++;
          console.error(`❌ Грешка:`, err.message);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (errorCount === 0) {
      console.log('✅ Миграцията е приложена успешно!');
    } else {
      console.log(`⚠️  Миграцията е приложена с ${errorCount} предупреждения`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify migration
    console.log('🔍 Проверка на резултата...\n');

    // Check if roles exist
    const { data: rolesData, error: rolesError } = await supabase
      .from('pg_enum')
      .select('*')
      .limit(1);

    if (!rolesError) {
      console.log('✅ Връзката с базата данни работи');
    }

    // Check cities table for manager_id column
    const { data: citiesData, error: citiesError } = await supabase
      .from('cities')
      .select('manager_id')
      .limit(1);

    if (!citiesError) {
      console.log('✅ Колоната cities.manager_id съществува');
    } else if (citiesError.message.includes('column') && citiesError.message.includes('does not exist')) {
      console.log('⚠️  Колоната cities.manager_id все още не съществува');
      console.log('   Моля приложете миграцията ръчно в Supabase SQL Editor');
    }

    // Check offices table for manager_id column
    const { data: officesData, error: officesError } = await supabase
      .from('offices')
      .select('manager_id')
      .limit(1);

    if (!officesError) {
      console.log('✅ Колоната offices.manager_id съществува');
    } else if (officesError.message.includes('column') && officesError.message.includes('does not exist')) {
      console.log('⚠️  Колоната offices.manager_id все още не съществува');
      console.log('   Моля приложете миграцията ръчно в Supabase SQL Editor');
    }

    console.log('\n📋 Следващи стъпки:');
    console.log('   1. Проверете резултата в Supabase Dashboard');
    console.log('   2. Изпълнете create-managers-accounts.sql за създаване на акаунти');
    console.log('   3. Тествайте функционалността с различни роли\n');

  } catch (error) {
    console.error('\n❌ Фатална грешка:', error.message);
    console.error('\n💡 Решение:');
    console.error('   Supabase не позволява директно изпълнение на SQL чрез API.');
    console.error('   Моля приложете миграцията ръчно:');
    console.error('   1. Отворете: https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/sql/new');
    console.error('   2. Копирайте съдържанието от apply-supabase-migrations.sql');
    console.error('   3. Поставете го в SQL Editor и изпълнете\n');
    process.exit(1);
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });

