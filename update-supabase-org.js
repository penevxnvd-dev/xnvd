// Script to update Supabase organization and project references
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 Обновяване на Supabase организация');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const OLD_ORG = 'ufpeftuanzmkiryohesd';
const NEW_ORG = 'rbpqagivdpacdvwlwgep';

// Files to update
const filesToUpdate = [
  'get-database-url.md',
  'MIGRATION_GUIDE.md',
  'CREATE_MANAGERS_README.md',
  'APPLY_MIGRATIONS.md',
  'apply-supabase-migrations.sql',
  'create-managers-accounts.sql',
  'apply-migration.js',
  'migrate.js',
  'migrate-direct.js',
  'run-migration.js',
  'auto-migrate.js',
  'apply-migration-auto.js',
  'apply-migration-simple.js',
  'apply-migration-via-api.js',
  'create-managers-accounts.js',
  'server/scripts/create-managers-supabase.js',
  'SUPABASE_LINKS.md',
];

let updatedCount = 0;

filesToUpdate.forEach(file => {
  const filePath = join(process.cwd(), file);
  if (!existsSync(filePath)) {
    return;
  }

  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Replace old project reference with new org reference
    content = content.replace(
      new RegExp(OLD_ORG, 'g'),
      NEW_ORG
    );
    
    // Update organization URLs
    content = content.replace(
      /https:\/\/supabase\.com\/dashboard\/project\/[^\/]+/g,
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

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Следващи стъпки:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. Отворете новата организация:');
console.log(`   https://supabase.com/dashboard/org/${NEW_ORG}\n`);
console.log('2. Изберете или създайте проект в тази организация\n');
console.log('3. Обновете .env файла с новите credentials:');
console.log('   - VITE_SUPABASE_URL');
console.log('   - VITE_SUPABASE_PUBLISHABLE_KEY');
console.log('   - DATABASE_URL (ако използвате миграции)\n');
console.log('4. Приложете миграциите в новия проект\n');

