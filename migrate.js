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

const DATABASE_URL = envVars.DATABASE_URL || envVars.SUPABASE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не е намерен в .env');
  console.error('\n💡 Добавете DATABASE_URL в .env файла:');
  console.error('   Формат: postgresql://postgres:[password]@db.ufpeftuanzmkiryohesd.supabase.co:5432/postgres');
  console.error('   Паролата може да се намери в:');
  console.error('   https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/settings/database');
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
  console.error('   Моля инсталирайте PostgreSQL client\n');
  process.exit(1);
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

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Миграцията е приложена успешно!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
  // Clean up on error
  if (existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
  
  console.error('\n❌ Грешка:', error.message);
  
  if (error.message.includes('password authentication failed')) {
    console.error('\n💡 Проверете паролата в DATABASE_URL');
  } else if (error.message.includes('could not connect')) {
    console.error('\n💡 Проверете DATABASE_URL и интернет връзката');
  }
  
  process.exit(1);
}

