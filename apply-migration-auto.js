// Automatic migration script using Supabase database connection
import { readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
const DATABASE_URL = envVars.DATABASE_URL || envVars.SUPABASE_DATABASE_URL;

if (!SUPABASE_URL) {
  console.error('❌ Липсва VITE_SUPABASE_URL в .env файла');
  process.exit(1);
}

// Extract project reference
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'rbpqagivdpacdvwlwgep';

// Read migration file
const migrationPath = join(process.cwd(), 'apply-supabase-migrations.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Автоматично прилагане на миграция');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function applyMigrationWithSupabaseCLI() {
  try {
    console.log('📦 Проверка за Supabase CLI...');
    
    // Check if supabase CLI is installed
    try {
      await execAsync('which supabase');
      console.log('✅ Supabase CLI е намерен\n');
    } catch {
      console.log('⚠️  Supabase CLI не е инсталиран');
      console.log('📦 Инсталиране на Supabase CLI...\n');
      
      // Try to install via npm
      try {
        await execAsync('npm install -g supabase');
        console.log('✅ Supabase CLI е инсталиран\n');
      } catch (err) {
        console.error('❌ Не можах да инсталирам Supabase CLI');
        console.error('   Моля инсталирайте ръчно: npm install -g supabase');
        return false;
      }
    }

    // Link to project
    console.log('🔗 Свързване с Supabase проект...');
    try {
      await execAsync(`supabase link --project-ref ${projectRef}`, {
        env: {
          ...process.env,
          SUPABASE_ACCESS_TOKEN: envVars.SUPABASE_ACCESS_TOKEN || '',
        }
      });
      console.log('✅ Свързан с проект\n');
    } catch (err) {
      // If already linked, continue
      if (err.message.includes('already linked')) {
        console.log('✅ Вече е свързан с проект\n');
      } else {
        console.warn('⚠️  Не можах да се свържа автоматично');
        console.warn('   Може да се наложи да се свържете ръчно: supabase link');
      }
    }

    // Apply migration
    console.log('⏳ Прилагане на миграция...\n');
    const { stdout, stderr } = await execAsync(`supabase db push`, {
      cwd: join(process.cwd(), 'supabase'),
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: envVars.SUPABASE_ACCESS_TOKEN || '',
      }
    });

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);

    console.log('\n✅ Миграцията е приложена успешно!\n');
    return true;

  } catch (error) {
    console.error('❌ Грешка при използване на Supabase CLI:', error.message);
    return false;
  }
}

async function applyMigrationWithPSQL() {
  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL не е намерен в .env');
    console.log('   Опитвам се да конструирам от Supabase URL...\n');
    
    // Try to construct database URL from Supabase URL
    // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    // But we need the password from Supabase dashboard
    
    console.log('❌ Не мога да конструирам DATABASE_URL без парола');
    console.log('   Моля добавете DATABASE_URL в .env файла');
    console.log('   Формат: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    console.log('   Или: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres\n');
    return false;
  }

  try {
    console.log('📦 Проверка за psql...');
    await execAsync('which psql');
    console.log('✅ psql е намерен\n');

    // Write SQL to temp file
    const tempFile = join(process.cwd(), '.migration-temp.sql');
    require('fs').writeFileSync(tempFile, migrationSQL);

    console.log('⏳ Прилагане на миграция чрез psql...\n');
    
    const { stdout, stderr } = await execAsync(`psql "${DATABASE_URL}" -f "${tempFile}"`, {
      env: {
        ...process.env,
        PGPASSWORD: DATABASE_URL.match(/:(.+?)@/)?.[1] || '',
      }
    });

    // Clean up temp file
    require('fs').unlinkSync(tempFile);

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('NOTICE')) {
      console.error(stderr);
    }

    console.log('\n✅ Миграцията е приложена успешно!\n');
    return true;

  } catch (error) {
    console.error('❌ Грешка при използване на psql:', error.message);
    return false;
  }
}

async function applyMigrationWithAPI() {
  console.log('🌐 Опитвам се да приложа миграция чрез Supabase API...\n');
  
  // This won't work for arbitrary SQL, but we can try
  // Supabase doesn't allow direct SQL execution via API for security
  
  console.log('❌ Supabase не позволява директно изпълнение на SQL чрез API');
  console.log('   За сигурност, SQL трябва да се изпълнява чрез SQL Editor или CLI\n');
  return false;
}

async function main() {
  // Try methods in order of preference
  const methods = [
    { name: 'Supabase CLI', fn: applyMigrationWithSupabaseCLI },
    { name: 'psql (Direct DB)', fn: applyMigrationWithPSQL },
    { name: 'Supabase API', fn: applyMigrationWithAPI },
  ];

  for (const method of methods) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Метод: ${method.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const success = await method.fn();
    if (success) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Миграцията е приложена успешно!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }
  }

  // If all methods failed, provide instructions
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ Не можах автоматично да приложа миграцията');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 Решения:');
  console.log('\n1. Инсталирайте Supabase CLI:');
  console.log('   npm install -g supabase');
  console.log('   supabase login');
  console.log('   supabase link --project-ref ' + projectRef);
  console.log('   supabase db push\n');
  
  console.log('2. Или добавете DATABASE_URL в .env:');
  console.log('   DATABASE_URL=postgresql://postgres:[password]@db.' + projectRef + '.supabase.co:5432/postgres');
  console.log('   (Паролата може да се намери в Supabase Dashboard > Settings > Database)\n');
  
  console.log('3. Или използвайте SQL Editor:');
  console.log('   node apply-migration.js\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Фатална грешка:', error);
    process.exit(1);
  });

