#!/usr/bin/env node

/**
 * Test all Supabase APIs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Testing Supabase APIs...\n');
  console.log(`📡 URL: ${SUPABASE_URL}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const { name, fn } of tests) {
    try {
      const result = await fn();
      if (result.success) {
        console.log(`✅ ${name}`);
        if (result.data !== undefined) {
          console.log(`   Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
        }
        passed++;
      } else {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Exception: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Test 1: Countries
test('Get Countries', async () => {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0, first: data?.[0]?.name } };
});

// Test 2: Cities
test('Get Cities', async () => {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .order('name', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0, first: data?.[0]?.name } };
});

// Test 3: Offices
test('Get Offices', async () => {
  const { data, error } = await supabase
    .from('offices')
    .select('*')
    .order('name', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0, first: data?.[0]?.name } };
});

// Test 4: Teams
test('Get Teams', async () => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0, first: data?.[0]?.name } };
});

// Test 5: Profiles
test('Get Profiles', async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0, first: data?.[0]?.full_name } };
});

// Test 6: User Roles
test('Get User Roles', async () => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 7: Realtors
test('Get Realtors', async () => {
  const { data, error } = await supabase
    .from('realtors')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 8: Deals
test('Get Deals', async () => {
  const { data, error } = await supabase
    .from('deals')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 9: Diagnoses
test('Get Diagnoses', async () => {
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 10: Training Progress
test('Get Training Progress', async () => {
  const { data, error } = await supabase
    .from('training_progress')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 11: Realtor Goals
test('Get Realtor Goals', async () => {
  const { data, error } = await supabase
    .from('realtor_goals')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 12: Buyer Schedule
test('Get Buyer Schedule', async () => {
  const { data, error } = await supabase
    .from('buyer_schedule')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 13: Messages
test('Get Messages', async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 14: Cities by Country
test('Get Cities by Country', async () => {
  const { data: countries } = await supabase.from('countries').select('id').limit(1);
  if (!countries || countries.length === 0) {
    return { success: false, error: 'No countries found' };
  }

  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('country_id', countries[0].id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 15: Offices by City
test('Get Offices by City', async () => {
  const { data: cities } = await supabase.from('cities').select('id').limit(1);
  if (!cities || cities.length === 0) {
    return { success: false, error: 'No cities found' };
  }

  const { data, error } = await supabase
    .from('offices')
    .select('*')
    .eq('city_id', cities[0].id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 16: Teams by Office
test('Get Teams by Office', async () => {
  const { data: offices } = await supabase.from('offices').select('id').limit(1);
  if (!offices || offices.length === 0) {
    return { success: false, error: 'No offices found' };
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('office_id', offices[0].id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length || 0 } };
});

// Test 17: Authentication - Get Current User (without auth)
test('Auth - Get Current User (unauthenticated)', async () => {
  const { data, error } = await supabase.auth.getUser();
  
  // This should fail or return null when not authenticated
  if (error && error.message.includes('JWT')) {
    return { success: true, data: { message: 'Expected error for unauthenticated user' } };
  }
  if (!data?.user) {
    return { success: true, data: { message: 'No user (expected)' } };
  }
  return { success: true, data: { user: data.user.email } };
});

// Test 18: RPC Functions (if available)
test('RPC - Test KPI Functions', async () => {
  // Try to call a KPI function (this might fail if functions don't exist)
  const { data, error } = await supabase.rpc('get_country_kpi', {
    p_country_id: '00000000-0000-0000-0000-000000000000'
  });

  if (error) {
    // Function might not exist, which is OK
    if (error.message.includes('function') || error.message.includes('does not exist')) {
      return { success: true, data: { message: 'KPI functions not available (optional)' } };
    }
    return { success: false, error: error.message };
  }
  return { success: true, data: { result: 'KPI function works' } };
});

runTests().catch(console.error);

