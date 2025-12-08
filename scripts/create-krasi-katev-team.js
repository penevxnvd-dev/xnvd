/**
 * Script to create "Краси Кътев" team in Бургас office
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createKrasiKatevTeam() {
  try {
    console.log('🔍 Searching for Бургас office...');
    
    // Find Бургас city
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name')
      .ilike('name', '%Бургас%');
    
    if (citiesError) throw citiesError;
    
    if (!cities || cities.length === 0) {
      console.error('❌ Бургас city not found');
      process.exit(1);
    }
    
    const burgasCity = cities[0];
    console.log(`✅ Found city: ${burgasCity.name} (${burgasCity.id})`);
    
    // Find Бургас office
    const { data: offices, error: officesError } = await supabase
      .from('offices')
      .select('id, name, city_id')
      .eq('city_id', burgasCity.id);
    
    if (officesError) throw officesError;
    
    if (!offices || offices.length === 0) {
      console.error('❌ Бургас office not found');
      process.exit(1);
    }
    
    const burgasOffice = offices[0];
    console.log(`✅ Found office: ${burgasOffice.name} (${burgasOffice.id})`);
    
    // Check if team already exists
    const { data: existingTeams, error: checkError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('office_id', burgasOffice.id)
      .ilike('name', '%Краси Кътев%');
    
    if (checkError) throw checkError;
    
    if (existingTeams && existingTeams.length > 0) {
      console.log(`⚠️  Team "Краси Кътев" already exists: ${existingTeams[0].name} (${existingTeams[0].id})`);
      return;
    }
    
    // Find Краси Кътев profile to set as leader
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', '%Краси%Кътев%');
    
    if (profilesError) throw profilesError;
    
    let leaderId = null;
    if (profiles && profiles.length > 0) {
      leaderId = profiles[0].id;
      console.log(`✅ Found leader profile: ${profiles[0].full_name} (${leaderId})`);
    } else {
      console.log('⚠️  Краси Кътев profile not found, creating team without leader');
    }
    
    // Create the team
    console.log('📝 Creating team "Краси Кътев"...');
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert({
        name: 'Краси Кътев',
        office_id: burgasOffice.id,
        leader_id: leaderId
      })
      .select()
      .single();
    
    if (createError) throw createError;
    
    console.log(`✅ Successfully created team: ${team.name} (${team.id})`);
    console.log(`   Office: ${burgasOffice.name}`);
    if (leaderId) {
      console.log(`   Leader: ${profiles[0].full_name}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createKrasiKatevTeam();

