// Script to scan project for environment variables and map them to .env file
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Read .env file
const envPath = join(process.cwd(), '.env');
let envVars = {};

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    }
  });
} else {
  console.error('❌ .env file not found!');
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Environment Variables Mapping');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Required variables based on code analysis
const requiredVars = {
  // Frontend (Vite)
  'VITE_SUPABASE_URL': {
    description: 'Supabase project URL',
    alternatives: ['SUPABASE_URL'],
    found: false,
  },
  'VITE_SUPABASE_PUBLISHABLE_KEY': {
    description: 'Supabase anon/publishable key',
    alternatives: ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'],
    found: false,
  },
  // Optional frontend
  'VITE_SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Supabase service role key (optional, for admin operations)',
    alternatives: ['SUPABASE_SERVICE_ROLE_KEY'],
    found: false,
    optional: true,
  },
  'VITE_SENTRY_DSN': {
    description: 'Sentry DSN for error tracking (optional)',
    found: false,
    optional: true,
  },
  'VITE_GA_ID': {
    description: 'Google Analytics ID (optional)',
    found: false,
    optional: true,
  },
  'VITE_PLAUSIBLE_DOMAIN': {
    description: 'Plausible Analytics domain (optional)',
    found: false,
    optional: true,
  },
  // Backend (Server)
  'DATABASE_URL': {
    description: 'PostgreSQL database URL for Prisma',
    found: false,
    optional: true,
  },
};

// Check which variables are found
for (const [key, config] of Object.entries(requiredVars)) {
  if (envVars[key]) {
    config.found = true;
    console.log(`✅ ${key}`);
    console.log(`   ${config.description}`);
    console.log(`   Value: ${envVars[key].substring(0, 20)}...`);
  } else {
    // Check alternatives
    let foundInAlternative = false;
    for (const alt of config.alternatives || []) {
      if (envVars[alt]) {
        foundInAlternative = true;
        console.log(`⚠️  ${key} (using alternative: ${alt})`);
        console.log(`   ${config.description}`);
        console.log(`   Value: ${envVars[alt].substring(0, 20)}...`);
        break;
      }
    }
    
    if (!foundInAlternative) {
      if (config.optional) {
        console.log(`⚪ ${key} (optional - not set)`);
        console.log(`   ${config.description}`);
      } else {
        console.log(`❌ ${key} (MISSING)`);
        console.log(`   ${config.description}`);
        if (config.alternatives && config.alternatives.length > 0) {
          console.log(`   Alternatives: ${config.alternatives.join(', ')}`);
        }
      }
    }
  }
  console.log('');
}

// Show all .env variables
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 All Variables in .env');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const sortedKeys = Object.keys(envVars).sort();
sortedKeys.forEach(key => {
  const value = envVars[key];
  const isSecret = key.toLowerCase().includes('key') || 
                   key.toLowerCase().includes('secret') || 
                   key.toLowerCase().includes('password') ||
                   key.toLowerCase().includes('token');
  
  if (isSecret) {
    console.log(`${key}=${value.substring(0, 10)}...${value.substring(value.length - 4)}`);
  } else {
    console.log(`${key}=${value}`);
  }
});

// Check for unused variables
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Variable Usage Analysis');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const allEnvKeys = Object.keys(envVars);
const knownVars = Object.keys(requiredVars).concat(
  ...Object.values(requiredVars).map(v => v.alternatives || [])
).filter(Boolean);

const unknownVars = allEnvKeys.filter(key => !knownVars.includes(key));

if (unknownVars.length > 0) {
  console.log('⚠️  Unknown variables (not used in code):');
  unknownVars.forEach(key => {
    console.log(`   - ${key}`);
  });
} else {
  console.log('✅ All variables are recognized');
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const required = Object.entries(requiredVars).filter(([_, config]) => !config.optional);
const foundRequired = required.filter(([key, config]) => {
  if (config.found) return true;
  if (config.alternatives) {
    return config.alternatives.some(alt => envVars[alt]);
  }
  return false;
});

console.log(`Required variables: ${foundRequired.length}/${required.length} found`);
console.log(`Optional variables: ${Object.values(requiredVars).filter(v => v.optional && v.found).length} set`);
console.log(`Total variables in .env: ${allEnvKeys.length}`);

if (foundRequired.length < required.length) {
  console.log('\n⚠️  Some required variables are missing!');
  console.log('   Please check the list above and add missing variables.');
} else {
  console.log('\n✅ All required variables are present!');
}

console.log('');

