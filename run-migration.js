// Simple migration script - requires DATABASE_URL in .env
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
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

const DATABASE_URL = envVars.DATABASE_URL || envVars.SUPABASE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не е намерен в .env');
  console.error('\n💡 Добавете DATABASE_URL в .env файла:');
  console.error('   Формат: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
  console.error('   Или: postgresql://postgres:[password]@db.qxompdwqdnemsntssjot.supabase.co:5432/postgres');
  console.error('\n   Паролата може да се намери в:');
  console.error('   https://supabase.com/dashboard/project/qxompdwqdnemsntssjot/settings/database');
  console.error('   (Connection string > Connection pooling > Session mode)\n');
  process.exit(1);
}

// Read migration
const migrationFile = join(process.cwd(), 'apply-supabase-migrations.sql');
if (!existsSync(migrationFile)) {
  console.error(`❌ Файлът ${migrationFile} не съществува`);
  process.exit(1);
}

const migrationSQL = readFileSync(migrationFile, 'utf-8');

// Check psql
try {
  await execAsync('which psql');
} catch {
  console.error('❌ psql не е намерен');
  console.error('   Моля инсталирайте PostgreSQL client: sudo apt-get install postgresql-client\n');
  process.exit(1);
}

// Write to temp file
const tempFile = join(process.cwd(), '.migration-temp.sql');
writeFileSync(tempFile, migrationSQL);

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
  unlinkSync(tempFile);

  if (stdout) console.log(stdout);
  if (stderr) {
    // Filter out NOTICE messages and "already exists" warnings
    const lines = stderr.split('\n').filter(line => {
      const lower = line.toLowerCase();
      return !lower.includes('notice') && 
             !lower.includes('already exists') &&
             !lower.includes('does not exist, skipping') &&
             line.trim().length > 0;
    });
    if (lines.length > 0) {
      console.warn('⚠️  Предупреждения:');
      console.warn(lines.join('\n'));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Миграцията е приложена успешно!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 Следващи стъпки:');
  console.log('   1. Проверете резултата в Supabase Dashboard');
  console.log('   2. Изпълнете create-managers-accounts.sql за създаване на акаунти\n');

} catch (error) {
  // Clean up on error
  if (existsSync(tempFile)) {
    unlinkSync(tempFile);
  }
  
  console.error('\n❌ Грешка:', error.message);
  
  if (error.message.includes('password authentication failed')) {
    console.error('\n💡 Проверете паролата в DATABASE_URL');
  } else if (error.message.includes('could not connect')) {
    console.error('\n💡 Проверете DATABASE_URL и интернет връзката');
    console.error('   Уверете се, че използвате правилния connection string');
  } else if (error.message.includes('timeout')) {
    console.error('\n💡 Миграцията отне твърде много време');
    console.error('   Проверете дали базата данни е достъпна');
  }
  
  process.exit(1);
}
