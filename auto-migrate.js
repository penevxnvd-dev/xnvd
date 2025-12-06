// Automatic migration script - uses Supabase CLI or psql
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Автоматично прилагане на миграция');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const PROJECT_REF = 'rbpqagivdpacdvwlwgep';
const migrationFile = join(process.cwd(), 'apply-supabase-migrations.sql');

async function installSupabaseCLI() {
  console.log('📦 Инсталиране на Supabase CLI...\n');
  
  try {
    // Download and install Supabase CLI
    await execAsync('curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz');
    await execAsync('tar -xzf /tmp/supabase.tar.gz -C /tmp');
    
    // Check if we can write to /usr/local/bin
    try {
      await execAsync('sudo mv /tmp/supabase /usr/local/bin/supabase');
      await execAsync('sudo chmod +x /usr/local/bin/supabase');
      console.log('✅ Supabase CLI е инсталиран в /usr/local/bin\n');
      return true;
    } catch {
      // Try local installation
      const localBin = join(process.cwd(), 'node_modules', '.bin', 'supabase');
      const localDir = join(process.cwd(), 'node_modules', '.bin');
      if (!existsSync(localDir)) {
        await execAsync(`mkdir -p "${localDir}"`);
      }
      await execAsync(`mv /tmp/supabase "${localBin}"`);
      await execAsync(`chmod +x "${localBin}"`);
      console.log('✅ Supabase CLI е инсталиран локално\n');
      return localBin;
    }
  } catch (error) {
    console.error('❌ Грешка при инсталиране:', error.message);
    return false;
  }
}

async function checkSupabaseCLI() {
  try {
    const { stdout } = await execAsync('which supabase');
    const cliPath = stdout.trim();
    await execAsync('supabase --version');
    console.log(`✅ Supabase CLI: ${cliPath}\n`);
    return cliPath;
  } catch {
    return await installSupabaseCLI();
  }
}

async function applyWithSupabaseCLI(cliPath = 'supabase') {
  try {
    // Check if logged in
    try {
      await execAsync(`${cliPath} projects list`, { timeout: 5000 });
    } catch {
      console.log('🔐 Влизане в Supabase...');
      console.log('Моля влезте в Supabase CLI:\n');
      await execAsync(`${cliPath} login`);
    }

    // Link to project
    console.log(`🔗 Свързване с проект: ${PROJECT_REF}...`);
    try {
      await execAsync(`${cliPath} link --project-ref ${PROJECT_REF}`);
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
    const { stdout, stderr } = await execAsync(`${cliPath} db push`, { timeout: 60000 });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('already exists')) {
      console.warn(stderr);
    }

    console.log('\n✅ Миграцията е приложена успешно!\n');
    return true;

  } catch (error) {
    console.error('❌ Грешка:', error.message);
    return false;
  }
}

async function main() {
  // Check if migration file exists
  if (!existsSync(migrationFile)) {
    console.error(`❌ Файлът ${migrationFile} не съществува`);
    process.exit(1);
  }

  // Try Supabase CLI
  const cliPath = await checkSupabaseCLI();
  if (cliPath) {
    const success = await applyWithSupabaseCLI(cliPath);
    if (success) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Готово!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }
  }

  console.log('\n❌ Не можах автоматично да приложа миграцията');
  console.log('💡 Моля използвайте: node apply-migration.js\n');
  process.exit(1);
}

main();

