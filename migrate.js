// Simple migration script using direct database connection
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

// Try Supabase CLI first, then fallback to psql
const SUPABASE_CLI = process.env.HOME + '/.local/bin/supabase';
const hasSupabaseCLI = existsSync(SUPABASE_CLI);

const DATABASE_URL = envVars.DATABASE_URL || envVars.SUPABASE_DATABASE_URL;
const SUPABASE_ACCESS_TOKEN = envVars.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'rbpqagivdpacdvwlwgep';

// Read migration
const migrationFile = join(process.cwd(), 'apply-supabase-migrations.sql');
if (!existsSync(migrationFile)) {
  console.error(`❌ Файлът ${migrationFile} не съществува`);
  process.exit(1);
}

const migrationSQL = readFileSync(migrationFile, 'utf-8');

async function applyWithSupabaseCLI() {
  if (!hasSupabaseCLI) {
    return false;
  }

  try {
    console.log('📦 Използване на Supabase CLI...\n');

    // Set access token if available
    const env = { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` };
    if (SUPABASE_ACCESS_TOKEN) {
      env.SUPABASE_ACCESS_TOKEN = SUPABASE_ACCESS_TOKEN;
      console.log('✅ Използвам access token от .env\n');
    } else {
      // Check if logged in
      try {
        await execAsync(`${SUPABASE_CLI} projects list`, { timeout: 5000, env });
      } catch {
        console.log('🔐 Влизане в Supabase...');
        console.log('Моля влезте в Supabase CLI (ще се отвори браузър):\n');
        await execAsync(`${SUPABASE_CLI} login`, { env });
      }
    }

    // Link to project
    console.log(`🔗 Свързване с проект: ${PROJECT_REF}...`);
    try {
      await execAsync(`${SUPABASE_CLI} link --project-ref ${PROJECT_REF}`, { env });
      console.log('✅ Свързан с проект\n');
    } catch (err) {
      if (err.message.includes('already linked') || err.message.includes('already exists')) {
        console.log('✅ Вече е свързан\n');
      } else {
        throw err;
      }
    }

    // Copy migration to supabase/migrations
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const fs = await import('fs');
    if (!existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const targetFile = join(migrationsDir, `${Date.now()}_apply_migrations.sql`);
    fs.copyFileSync(migrationFile, targetFile);
    console.log('📁 Миграцията е копирана в supabase/migrations/\n');

    // Apply migration
    console.log('⏳ Прилагане на миграция...\n');
    const { stdout, stderr } = await execAsync(`${SUPABASE_CLI} db push`, { 
      timeout: 60000,
      env
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('already exists')) {
      console.warn(stderr);
    }

    console.log('\n✅ Миграцията е приложена успешно!\n');
    return true;

  } catch (error) {
    console.error('❌ Грешка с Supabase CLI:', error.message);
    return false;
  }
}

async function applyWithPSQL() {
  if (!DATABASE_URL) {
    return false;
  }

  // Check psql
  try {
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
      fs.unlinkSync(tempFile);
    }
    
    console.error('❌ Грешка с psql:', error.message);
    return false;
  }
}

async function main() {
  // Try Supabase CLI first
  if (hasSupabaseCLI) {
    const success = await applyWithSupabaseCLI();
    if (success) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Готово!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }
  }

  // Fallback to psql
  if (DATABASE_URL) {
    const success = await applyWithPSQL();
    if (success) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Готово!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }
  }

  // If both failed
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ Не можах автоматично да приложа миграцията');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 Решения:');
  console.log('\n1. Добавете DATABASE_URL в .env:');
  console.log('   DATABASE_URL=postgresql://postgres:[password]@db.rbpqagivdpacdvwlwgep.supabase.co:5432/postgres');
  console.log('   (Паролата от: https://supabase.com/dashboard/org/rbpqagivdpacdvwlwgep/settings/database)\n');
  
  console.log('2. Или използвайте Supabase CLI:');
  console.log('   ~/.local/bin/supabase login');
  console.log('   ~/.local/bin/supabase link --project-ref rbpqagivdpacdvwlwgep\n');
  
  process.exit(1);
}

main();
