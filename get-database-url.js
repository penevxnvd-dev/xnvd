// Helper script to guide user to get DATABASE_URL
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Как да получите DATABASE_URL');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const PROJECT_ID = 'qxompdwqdnemsntssjot';
const ORG_ID = 'rbpqagivdpacdvwlwgep';

console.log('📍 Проект ID:', PROJECT_ID);
console.log('📍 Организация ID:', ORG_ID);
console.log('\n');

console.log('📝 Стъпка 1: Отворете Database Settings');
console.log(`   👉 https://supabase.com/dashboard/project/${PROJECT_ID}/settings/database\n`);

console.log('📝 Стъпка 2: Намерете Connection String');
console.log('   1. Скролнете до секцията "Connection string"');
console.log('   2. Изберете таб "Connection pooling"');
console.log('   3. Изберете режим "Session mode"');
console.log('   4. Копирайте connection string-а\n');

console.log('📝 Стъпка 3: Добавете в .env');
console.log('   Отворете .env файла и добавете:');
console.log('\n   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
console.log('\n   Или използвайте директния connection string:');
console.log('\n   DATABASE_URL=postgresql://postgres:[password]@db.qxompdwqdnemsntssjot.supabase.co:5432/postgres\n');

// Check if .env exists and if DATABASE_URL is already there
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  const hasDatabaseUrl = envContent.includes('DATABASE_URL=');
  
  if (hasDatabaseUrl) {
    console.log('✅ DATABASE_URL вече е в .env файла');
    console.log('   Проверете дали стойността е правилна\n');
  } else {
    console.log('⚠️  DATABASE_URL не е намерен в .env файла');
    console.log('   Моля добавете го според инструкциите по-горе\n');
  }
} else {
  console.log('⚠️  .env файлът не съществува');
  console.log('   Създайте го и добавете DATABASE_URL\n');
}

console.log('📝 Стъпка 4: Изпълнете миграцията');
console.log('   node run-migration.js\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💡 Важно:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('   • Паролата е чувствителна информация - не я споделяйте');
console.log('   • Използвайте "Session mode" за по-добра производителност');
console.log('   • Connection string-ът трябва да е на един ред в .env файла');
console.log('   • Ако не виждате паролата, натиснете "Reveal" бутона\n');

