// Script to update Supabase project reference
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 Обновяване на Supabase проект');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const OLD_PROJECT = 'qxompdwqdnemsntssjot';
const NEW_PROJECT = 'qxompdwqdnemsntssjot';
const NEW_ORG = 'rbpqagivdpacdvwlwgep';

// Find all files containing old project reference
async function findFiles() {
  try {
    const { stdout } = await execAsync(`grep -r "${OLD_PROJECT}" --include="*.js" --include="*.md" --include="*.sql" --include="*.ts" --include="*.tsx" --include="*.json" . | cut -d: -f1 | sort -u`);
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const files = await findFiles();

console.log(`📁 Намерени ${files.length} файла за обновяване\n`);

let updatedCount = 0;

files.forEach(file => {
  const filePath = join(process.cwd(), file);
  if (!existsSync(filePath)) {
    return;
  }

  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Replace old project reference
    content = content.replace(
      new RegExp(OLD_PROJECT, 'g'),
      NEW_PROJECT
    );
    
    // Update project URLs
    content = content.replace(
      /https:\/\/supabase\.com\/dashboard\/project\/[^\/\s"']+/g,
      `https://supabase.com/dashboard/project/${NEW_PROJECT}`
    );
    
    // Update organization URLs
    content = content.replace(
      /https:\/\/supabase\.com\/dashboard\/org\/[^\/\s"']+/g,
      `https://supabase.com/dashboard/org/${NEW_ORG}`
    );
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Обновен: ${file}`);
      updatedCount++;
    }
  } catch (error) {
    console.warn(`⚠️  Грешка при обновяване на ${file}:`, error.message);
  }
});

console.log(`\n✅ Обновени ${updatedCount} файла\n`);

// Update .env file if it exists
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  try {
    let envContent = readFileSync(envPath, 'utf-8');
    const originalEnv = envContent;
    
    // Update SUPABASE_URL if it contains old project
    envContent = envContent.replace(
      new RegExp(`https://${OLD_PROJECT}\\.supabase\\.co`, 'g'),
      `https://${NEW_PROJECT}.supabase.co`
    );
    
    if (envContent !== originalEnv) {
      writeFileSync(envPath, envContent, 'utf-8');
      console.log('✅ Обновен: .env файл');
    } else {
      console.log('ℹ️  .env файлът не съдържа стария проект ID');
      console.log('   Моля обновете ръчно с новите credentials:\n');
      console.log(`   VITE_SUPABASE_URL=https://${NEW_PROJECT}.supabase.co`);
      console.log('   VITE_SUPABASE_PUBLISHABLE_KEY=[нов ключ от Settings > API]');
      console.log(`   DATABASE_URL=postgresql://postgres:[password]@db.${NEW_PROJECT}.supabase.co:5432/postgres\n`);
    }
  } catch (error) {
    console.warn('⚠️  Не можах да обновя .env файла:', error.message);
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Следващи стъпки:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. Обновете .env файла с новите credentials:');
console.log(`   VITE_SUPABASE_URL=https://${NEW_PROJECT}.supabase.co`);
console.log('   VITE_SUPABASE_PUBLISHABLE_KEY=[от Settings > API]');
console.log(`   DATABASE_URL=postgresql://postgres:[password]@db.${NEW_PROJECT}.supabase.co:5432/postgres\n`);
console.log('2. Приложете миграциите:');
console.log('   node run-migration.js\n');
console.log('3. Създайте мениджърските акаунти:');
console.log('   node create-managers-accounts.js\n');

