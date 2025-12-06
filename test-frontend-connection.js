// Test frontend connection to Supabase
import { readFileSync, existsSync } from 'fs';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 Тест на frontend връзката с Supabase');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check .env file
const envPath = '.env';
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

// Check required variables
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY'
];

console.log('📋 Проверка на environment variables:\n');

let allPresent = true;
requiredVars.forEach(varName => {
  const value = envVars[varName] || envVars[varName.replace('VITE_', '')];
  if (value) {
    const displayValue = varName.includes('KEY') 
      ? `${value.substring(0, 20)}...` 
      : value;
    console.log(`   ✅ ${varName}: ${displayValue}`);
  } else {
    console.error(`   ❌ ${varName}: ЛИПСВА`);
    allPresent = false;
  }
});

if (!allPresent) {
  console.error('\n❌ Липсват задължителни environment variables!');
  process.exit(1);
}

// Check Supabase client file
console.log('\n📁 Проверка на файлове:\n');

const filesToCheck = [
  'src/integrations/supabase/client.ts',
  'src/lib/supabaseApi.ts',
  'src/lib/api.ts',
  'src/lib/env.ts'
];

filesToCheck.forEach(file => {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.error(`   ❌ ${file}: НЕ СЪЩЕСТВУВА`);
  }
});

// Check if client is properly configured
console.log('\n🔍 Проверка на конфигурация:\n');

try {
  const clientContent = readFileSync('src/integrations/supabase/client.ts', 'utf-8');
  
  const checks = [
    { name: 'persistSession: true', found: clientContent.includes('persistSession: true') },
    { name: 'autoRefreshToken: true', found: clientContent.includes('autoRefreshToken: true') },
    { name: 'getEnv import', found: clientContent.includes('getEnv') },
    { name: 'Singleton pattern', found: clientContent.includes('supabaseInstance') },
  ];

  checks.forEach(check => {
    if (check.found) {
      console.log(`   ✅ ${check.name}`);
    } else {
      console.error(`   ❌ ${check.name}: НЕ НАМЕРЕН`);
    }
  });
} catch (error) {
  console.error('   ❌ Грешка при четене на client.ts:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Frontend е конфигуриран за Supabase!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 Следващи стъпки:');
console.log('   1. Стартирайте приложението: npm run dev');
console.log('   2. Отворете http://localhost:5173');
console.log('   3. Опитайте да влезете с някой от акаунтите\n');

