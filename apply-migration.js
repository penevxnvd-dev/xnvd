// Script to help apply Supabase migration
// This script opens the SQL Editor and provides instructions
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

if (!SUPABASE_URL) {
  console.error('❌ Липсва VITE_SUPABASE_URL в .env файла');
  process.exit(1);
}

// Extract project reference
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'ufpeftuanzmkiryohesd';

// Read migration file
const migrationPath = join(process.cwd(), 'apply-supabase-migrations.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Прилагане на миграция в Supabase');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

console.log('📋 Инструкции:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. SQL Editor ще се отвори в браузъра автоматично');
console.log('2. Копирайте SQL кода по-долу');
console.log('3. Поставете го в SQL Editor');
console.log('4. Кликнете на "Run" или натиснете Ctrl+Enter\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 SQL КОД ЗА КОПИРАНЕ:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(migrationSQL);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Try to open browser
console.log('🌐 Отваряне на SQL Editor в браузъра...\n');

const commands = [
  `xdg-open "${sqlEditorUrl}"`, // Linux
  `open "${sqlEditorUrl}"`,      // macOS
  `start "${sqlEditorUrl}"`,     // Windows
];

let opened = false;
for (const cmd of commands) {
  try {
    await execAsync(cmd);
    opened = true;
    console.log('✅ SQL Editor е отворен в браузъра!\n');
    break;
  } catch (err) {
    // Try next command
  }
}

if (!opened) {
  console.log('⚠️  Не можах автоматично да отворя браузъра.');
  console.log(`   Моля отворете ръчно: ${sqlEditorUrl}\n`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Готово!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 Следващи стъпки:');
console.log('   1. Копирайте SQL кода отгоре');
console.log('   2. Поставете го в SQL Editor');
console.log('   3. Изпълнете миграцията');
console.log('   4. Проверете резултата\n');
