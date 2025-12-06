// Simple automatic migration using Supabase CLI
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Автоматично прилагане на миграция');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function checkSupabaseCLI() {
  try {
    await execAsync('which supabase');
    const { stdout } = await execAsync('supabase --version');
    console.log(`✅ Supabase CLI: ${stdout.trim()}\n`);
    return true;
  } catch {
    console.log('📦 Инсталиране на Supabase CLI...\n');
    try {
      await execAsync('npm install -g supabase');
      console.log('✅ Supabase CLI е инсталиран\n');
      return true;
    } catch (err) {
      console.error('❌ Не можах да инсталирам Supabase CLI');
      console.error('   Моля инсталирайте ръчно: npm install -g supabase\n');
      return false;
    }
  }
}

async function applyMigration() {
  const PROJECT_REF = 'ufpeftuanzmkiryohesd';
  const migrationFile = join(process.cwd(), 'apply-supabase-migrations.sql');

  try {
    // Check if migration file exists
    readFileSync(migrationFile, 'utf-8');
    console.log('📝 Намерен файл за миграция: apply-supabase-migrations.sql\n');

    // Check if logged in
    try {
      await execAsync('supabase projects list', { timeout: 5000 });
    } catch {
      console.log('🔐 Влизане в Supabase...');
      console.log('Моля влезте в Supabase CLI (ще се отвори браузър):\n');
      await execAsync('supabase login');
    }

    // Link to project (ignore if already linked)
    console.log(`🔗 Свързване с проект: ${PROJECT_REF}...`);
    try {
      await execAsync(`supabase link --project-ref ${PROJECT_REF}`);
      console.log('✅ Свързан с проект\n');
    } catch (err) {
      if (err.message.includes('already linked') || err.message.includes('already exists')) {
        console.log('✅ Вече е свързан с проект\n');
      } else {
        throw err;
      }
    }

    // Execute migration
    console.log('⏳ Прилагане на миграция...\n');
    
    // Try to execute SQL file directly
    try {
      const { stdout, stderr } = await execAsync(
        `supabase db execute --file "${migrationFile}"`,
        { timeout: 30000 }
      );
      
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('NOTICE')) console.warn(stderr);
      
      console.log('\n✅ Миграцията е приложена успешно!\n');
      return true;
    } catch (err) {
      // If db execute doesn't work, try alternative
      console.log('⚠️  db execute не работи, опитвам алтернативен метод...\n');
      
      // Copy migration to supabase/migrations and use db push
      const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
      const fs = await import('fs');
      const path = await import('path');
      
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }
      
      const targetFile = path.join(migrationsDir, `${Date.now()}_apply_migrations.sql`);
      fs.copyFileSync(migrationFile, targetFile);
      
      console.log('📁 Копиран файл в supabase/migrations/\n');
      console.log('⏳ Прилагане чрез db push...\n');
      
      const { stdout, stderr } = await execAsync('supabase db push', { timeout: 30000 });
      
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('warning')) {
        console.warn(stderr);
      }
      
      console.log('\n✅ Миграцията е приложена успешно!\n');
      return true;
    }

  } catch (error) {
    console.error('\n❌ Грешка:', error.message);
    return false;
  }
}

async function main() {
  const hasCLI = await checkSupabaseCLI();
  if (!hasCLI) {
    console.log('💡 Моля инсталирайте Supabase CLI и опитайте отново\n');
    process.exit(1);
  }

  const success = await applyMigration();
  
  if (success) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Готово!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Не можах да приложа миграцията');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

main();

