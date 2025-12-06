// Script to update .env file with new Supabase credentials
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 Обновяване на .env файл');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const envPath = join(process.cwd(), '.env');

// New credentials
const NEW_SUPABASE_URL = 'https://qxompdwqdnemsntssjot.supabase.co';
const NEW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b21wZHdxZG5lbXNudHNzam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODYzNzcsImV4cCI6MjA4MDA2MjM3N30.J2xIe0lipsAkMi2AgkJuz0G9L1F2w7I8JWiwiOxQQHY';

if (!existsSync(envPath)) {
  console.log('⚠️  .env файлът не съществува. Създавам нов...\n');
  
  const newEnvContent = `# Supabase Configuration
VITE_SUPABASE_URL=${NEW_SUPABASE_URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${NEW_SUPABASE_ANON_KEY}

# Database (optional - for migrations)
# DATABASE_URL=postgresql://postgres:[password]@db.qxompdwqdnemsntssjot.supabase.co:5432/postgres

# Supabase Access Token (optional - for migrations)
# SUPABASE_ACCESS_TOKEN=your_access_token_here
`;

  writeFileSync(envPath, newEnvContent, 'utf-8');
  console.log('✅ Създаден нов .env файл с новите credentials\n');
} else {
  try {
    let envContent = readFileSync(envPath, 'utf-8');
    const originalContent = envContent;
    
    // Update or add VITE_SUPABASE_URL
    if (envContent.includes('VITE_SUPABASE_URL=')) {
      envContent = envContent.replace(
        /VITE_SUPABASE_URL=.*/g,
        `VITE_SUPABASE_URL=${NEW_SUPABASE_URL}`
      );
    } else {
      envContent += `\nVITE_SUPABASE_URL=${NEW_SUPABASE_URL}\n`;
    }
    
    // Update or add VITE_SUPABASE_PUBLISHABLE_KEY (also check for ANON_KEY)
    if (envContent.includes('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      envContent = envContent.replace(
        /VITE_SUPABASE_PUBLISHABLE_KEY=.*/g,
        `VITE_SUPABASE_PUBLISHABLE_KEY=${NEW_SUPABASE_ANON_KEY}`
      );
    } else if (envContent.includes('VITE_SUPABASE_ANON_KEY=')) {
      envContent = envContent.replace(
        /VITE_SUPABASE_ANON_KEY=.*/g,
        `VITE_SUPABASE_PUBLISHABLE_KEY=${NEW_SUPABASE_ANON_KEY}`
      );
    } else {
      envContent += `VITE_SUPABASE_PUBLISHABLE_KEY=${NEW_SUPABASE_ANON_KEY}\n`;
    }
    
    // Update DATABASE_URL if it exists
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/g,
        (match) => {
          // Only update if it contains old project reference
          if (match.includes('ufpeftuanzmkiryohesd')) {
            return match.replace('ufpeftuanzmkiryohesd', 'qxompdwqdnemsntssjot');
          }
          return match;
        }
      );
    }
    
    if (envContent !== originalContent) {
      writeFileSync(envPath, envContent, 'utf-8');
      console.log('✅ Обновен .env файл с новите credentials\n');
    } else {
      console.log('ℹ️  .env файлът вече съдържа правилните стойности\n');
    }
  } catch (error) {
    console.error('❌ Грешка при обновяване на .env файла:', error.message);
    process.exit(1);
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Готово!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Обновени credentials:');
console.log(`  VITE_SUPABASE_URL=${NEW_SUPABASE_URL}`);
console.log(`  VITE_SUPABASE_PUBLISHABLE_KEY=${NEW_SUPABASE_ANON_KEY.substring(0, 50)}...\n`);
console.log('Следващи стъпки:');
console.log('  1. Приложете миграциите: node run-migration.js');
console.log('  2. Създайте мениджърските акаунти: node create-managers-accounts.js\n');

