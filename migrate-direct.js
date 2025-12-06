// Direct migration using Supabase Management API with access token
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Автоматично прилагане на миграция');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Read .env
const envPath = join(process.cwd(), '.env');
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
const SUPABASE_ACCESS_TOKEN = envVars.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = SUPABASE_URL?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'rbpqagivdpacdvwlwgep';

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN не е намерен в .env');
  process.exit(1);
}

// Read migration
const migrationFile = join(process.cwd(), 'apply-supabase-migrations.sql');
if (!existsSync(migrationFile)) {
  console.error(`❌ Файлът ${migrationFile} не съществува`);
  process.exit(1);
}

const migrationSQL = readFileSync(migrationFile, 'utf-8');

console.log(`📡 Project: ${PROJECT_REF}`);
console.log(`📝 Миграция: ${migrationFile}`);
console.log(`📏 Размер: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

async function applyMigration() {
  try {
    console.log('⏳ Прилагане на миграция чрез Supabase Management API...\n');

    // Use Supabase Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        query: migrationSQL,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    console.log('✅ Миграцията е изпратена успешно!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Готово!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return true;

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Access token-ът не е валиден или няма права');
      console.error('   Проверете SUPABASE_ACCESS_TOKEN в .env\n');
    } else if (error.message.includes('404')) {
      console.error('\n💡 Management API endpoint не е наличен');
      console.error('   Опитвам алтернативен метод...\n');
      
      // Try alternative: Use Supabase CLI with access token
      return await applyWithCLI();
    } else {
      console.error('\n💡 Опитвам алтернативен метод...\n');
      return await applyWithCLI();
    }
    
    return false;
  }
}

async function applyWithCLI() {
  const DATABASE_URL = envVars.DATABASE_URL || envVars.SUPABASE_DATABASE_URL;
  
  // Try psql first if DATABASE_URL is available
  if (DATABASE_URL) {
    return await applyWithPSQL(DATABASE_URL);
  }

  const SUPABASE_CLI = process.env.HOME + '/.local/bin/supabase';
  
  if (!existsSync(SUPABASE_CLI)) {
    console.error('❌ Supabase CLI не е намерен и DATABASE_URL не е наличен');
    return false;
  }

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const env = { 
      ...process.env, 
      PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      SUPABASE_ACCESS_TOKEN 
    };

    // Copy migration to supabase/migrations
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const fs = await import('fs');
    if (!existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const targetFile = join(migrationsDir, `${Date.now()}_apply_migrations.sql`);
    fs.copyFileSync(migrationFile, targetFile);
    console.log('📁 Миграцията е копирана в supabase/migrations/\n');

    // Try to link first (might fail, but we'll continue)
    try {
      await execAsync(`${SUPABASE_CLI} link --project-ref ${PROJECT_REF}`, { env });
    } catch {
      // Ignore link errors
    }

    // Try db push (linked mode)
    console.log('⏳ Прилагане чрез Supabase CLI...\n');
    try {
      const { stdout, stderr } = await execAsync(
        `${SUPABASE_CLI} db push`,
        { env, timeout: 60000 }
      );
      
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('already exists')) {
        console.warn(stderr);
      }

      console.log('\n✅ Миграцията е приложена успешно!\n');
      return true;
    } catch (err) {
      throw new Error(`CLI error: ${err.message}`);
    }

  } catch (error) {
    console.error('❌ Грешка:', error.message);
    return false;
  }
}

async function applyWithPSQL(DATABASE_URL) {
  // Check psql
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('which psql');
  } catch {
    console.error('❌ psql не е намерен');
    return false;
  }

  // Write to temp file
  const tempFile = join(process.cwd(), '.migration-temp.sql');
  const fs = await import('fs');
  fs.writeFileSync(tempFile, migrationSQL);

  try {
    console.log('⏳ Прилагане на миграция чрез psql...\n');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Extract password from URL for PGPASSWORD
    const passwordMatch = DATABASE_URL.match(/:\/\/[^:]+:([^@]+)@/);
    const password = passwordMatch ? passwordMatch[1] : '';
    
    const env = { ...process.env };
    if (password) {
      env.PGPASSWORD = password;
    }

    const { stdout, stderr } = await execAsync(
      `psql "${DATABASE_URL}" -f "${tempFile}"`,
      { env, timeout: 60000 }
    );

    // Clean up
    fs.unlinkSync(tempFile);

    if (stdout) console.log(stdout);
    if (stderr) {
      // Filter out NOTICE messages
      const lines = stderr.split('\n').filter(line => 
        !line.includes('NOTICE') && 
        !line.includes('already exists') &&
        line.trim().length > 0
      );
      if (lines.length > 0) {
        console.warn(lines.join('\n'));
      }
    }

    console.log('\n✅ Миграцията е приложена успешно!\n');
    return true;

  } catch (error) {
    // Clean up on error
    if (existsSync(tempFile)) {
      const fs = await import('fs');
      fs.unlinkSync(tempFile);
    }
    
    console.error('❌ Грешка с psql:', error.message);
    return false;
  }
}

applyMigration()
  .then((success) => {
    if (success) {
      console.log('📋 Следващи стъпки:');
      console.log('   1. Проверете резултата в Supabase Dashboard');
      console.log('   2. Изпълнете create-managers-accounts.sql за създаване на акаунти\n');
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Фатална грешка:', error);
    process.exit(1);
  });

