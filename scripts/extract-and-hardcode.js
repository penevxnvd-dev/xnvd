#!/usr/bin/env node

/**
 * Extract all data from Supabase and create hardcoded fallback
 * This allows offline access to all accounts and data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
function loadEnv() {
  try {
    const envFile = readFileSync(join(rootDir, '.env'), 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    return env;
  } catch (error) {
    console.error('❌ Error loading .env file:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Use admin client if available, otherwise use regular client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function extractAllData() {
  console.log('📦 Extracting data from Supabase...\n');

  // Extract all tables
  const [countries, cities, offices, teams, profiles, userRoles, realtors] = await Promise.all([
    supabase.from('countries').select('*').order('name'),
    supabase.from('cities').select('*').order('name'),
    supabase.from('offices').select('*').order('name'),
    supabase.from('teams').select('*').order('name'),
    supabase.from('profiles').select('*'),
    supabase.from('user_roles').select('*'),
    supabase.from('realtors').select('*'),
  ]);

  // Check for errors
  const errors = [countries.error, cities.error, offices.error, teams.error, profiles.error, userRoles.error, realtors.error].filter(Boolean);
  if (errors.length > 0) {
    console.error('❌ Errors extracting data:');
    errors.forEach(e => console.error('  ', e));
  }

  const data = {
    countries: countries.data || [],
    cities: cities.data || [],
    offices: offices.data || [],
    teams: teams.data || [],
    profiles: profiles.data || [],
    user_roles: userRoles.data || [],
    realtors: realtors.data || [],
  };

  console.log(`✅ Extracted:`);
  console.log(`   Countries: ${data.countries.length}`);
  console.log(`   Cities: ${data.cities.length}`);
  console.log(`   Offices: ${data.offices.length}`);
  console.log(`   Teams: ${data.teams.length}`);
  console.log(`   Profiles: ${data.profiles.length}`);
  console.log(`   User Roles: ${data.user_roles.length}`);
  console.log(`   Realtors: ${data.realtors.length}\n`);

  // Create accounts map
  const accounts = {};
  data.profiles.forEach(profile => {
    const roles = data.user_roles
      .filter(ur => ur.user_id === profile.id)
      .map(ur => ur.role);
    
    const realtor = data.realtors.find(r => r.user_id === profile.id);
    
    accounts[profile.email] = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      roles: roles,
      realtor: realtor ? {
        id: realtor.id,
        level: realtor.level,
        hire_date: realtor.hire_date,
        team_id: realtor.team_id,
      } : null,
    };
  });

  // Create hierarchical structure
  const structure = data.countries.map(country => {
    const countryCities = data.cities.filter(c => c.country_id === country.id);
    
    const citiesWithOffices = countryCities.map(city => {
      const cityOffices = data.offices.filter(o => o.city_id === city.id);
      
      const officesWithTeams = cityOffices.map(office => {
        const officeTeams = data.teams.filter(t => t.office_id === office.id);
        
        const teamsWithLeaders = officeTeams.map(team => {
          const leader = team.leader_id 
            ? data.realtors.find(r => r.id === team.leader_id)
            : null;
          
          const leaderProfile = leader 
            ? data.profiles.find(p => p.id === leader.user_id)
            : null;
          
          const teamRealtors = data.realtors.filter(r => r.team_id === team.id);
          
          return {
            id: team.id,
            name: team.name,
            office_id: team.office_id,
            leader_id: team.leader_id,
            leader: leader && leaderProfile ? {
              id: leader.id,
              user_id: leader.user_id,
              level: leader.level,
              hire_date: leader.hire_date,
              profile: {
                id: leaderProfile.id,
                email: leaderProfile.email,
                full_name: leaderProfile.full_name,
              },
            } : null,
            realtors: teamRealtors.map(r => {
              const rProfile = data.profiles.find(p => p.id === r.user_id);
              return {
                id: r.id,
                user_id: r.user_id,
                level: r.level,
                hire_date: r.hire_date,
                profile: rProfile ? {
                  id: rProfile.id,
                  email: rProfile.email,
                  full_name: rProfile.full_name,
                } : null,
              };
            }),
          };
        });
        
        return {
          id: office.id,
          name: office.name,
          city_id: office.city_id,
          teams: teamsWithLeaders,
        };
      });
      
      return {
        id: city.id,
        name: city.name,
        country_id: city.country_id,
        offices: officesWithTeams,
      };
    });
    
    return {
      id: country.id,
      name: country.name,
      code: country.code,
      cities: citiesWithOffices,
    };
  });

  const hardcodedData = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    accounts,
    structure,
    countries: data.countries,
    cities: data.cities,
    offices: data.offices,
    teams: data.teams,
    profiles: data.profiles,
    user_roles: data.user_roles,
    realtors: data.realtors,
  };

  // Create TypeScript file with embedded data
  const jsonString = JSON.stringify(hardcodedData);
  const base64Data = Buffer.from(jsonString).toString('base64');
  
  const tsContent = `// Hardcoded data for offline fallback
// Generated: ${new Date().toISOString()}
// This file contains all necessary data for offline functionality
// Data is base64 encoded to reduce file size and obfuscate slightly

// Obfuscated data (base64 encoded JSON)
const _d = '${base64Data}';

// Decode and parse data
function _decode() {
  try {
    return JSON.parse(Buffer.from(_d, 'base64').toString('utf8'));
  } catch (e) {
    console.error('Failed to decode hardcoded data:', e);
    return null;
  }
}

// Cache decoded data
let _cached: ReturnType<typeof _decode> | null = null;

export function getHardcodedData() {
  if (!_cached) {
    _cached = _decode();
  }
  return _cached;
}

// Helper functions for quick access
export function getHardcodedAccounts() {
  const data = getHardcodedData();
  return data?.accounts || {};
}

export function getHardcodedStructure() {
  const data = getHardcodedData();
  return data?.structure || [];
}

export function getHardcodedCountries() {
  const data = getHardcodedData();
  return data?.countries || [];
}

export function getHardcodedCities() {
  const data = getHardcodedData();
  return data?.cities || [];
}

export function getHardcodedOffices() {
  const data = getHardcodedData();
  return data?.offices || [];
}

export function getHardcodedTeams() {
  const data = getHardcodedData();
  return data?.teams || [];
}

export function getHardcodedProfiles() {
  const data = getHardcodedData();
  return data?.profiles || [];
}

export function getHardcodedRealtors() {
  const data = getHardcodedData();
  return data?.realtors || [];
}

export function getHardcodedUserRoles() {
  const data = getHardcodedData();
  return data?.user_roles || [];
}

export function findAccountByEmail(email: string) {
  const accounts = getHardcodedAccounts();
  return accounts[email] || null;
}

export function findProfileById(id: string) {
  const profiles = getHardcodedProfiles();
  return profiles.find(p => p.id === id) || null;
}

export function getTeamsByOffice(officeId: string) {
  const teams = getHardcodedTeams();
  return teams.filter(t => t.office_id === officeId);
}

export function getOfficesByCity(cityId: string) {
  const offices = getHardcodedOffices();
  return offices.filter(o => o.city_id === cityId);
}

export function getCitiesByCountry(countryId: string) {
  const cities = getHardcodedCities();
  return cities.filter(c => c.country_id === countryId);
}

export function getRealtorsByTeam(teamId: string) {
  const realtors = getHardcodedRealtors();
  return realtors.filter(r => r.team_id === teamId);
}

export function getTeamLeader(teamId: string) {
  const team = getHardcodedTeams().find(t => t.id === teamId);
  if (!team || !team.leader_id) return null;
  
  const leader = getHardcodedRealtors().find(r => r.id === team.leader_id);
  if (!leader) return null;
  
  const profile = findProfileById(leader.user_id);
  return {
    ...leader,
    profile,
  };
}
`;

  // Write TypeScript file
  const outputPath = join(rootDir, 'src/lib/hardcodedData.ts');
  writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log(`✅ Hardcoded data file generated: ${outputPath}`);
  console.log(`   Accounts: ${Object.keys(accounts).length}`);
  console.log(`   Data size: ${(jsonString.length / 1024).toFixed(2)} KB`);
  console.log(`   Base64 size: ${(base64Data.length / 1024).toFixed(2)} KB\n`);
  
  // Also save as JSON for reference
  const jsonPath = join(rootDir, 'hardcoded-data.json');
  writeFileSync(jsonPath, JSON.stringify(hardcodedData, null, 2), 'utf8');
  console.log(`✅ JSON backup saved: ${jsonPath}`);
  
  // Update metadata to indicate hardcoded data was generated
  try {
    const metadataPath = join(rootDir, 'public/local-backup/metadata.json');
    let metadata = { last_sync: new Date().toISOString(), last_hardcode: new Date().toISOString() };
    try {
      const existing = JSON.parse(readFileSync(metadataPath, 'utf8'));
      metadata = { ...existing, last_hardcode: new Date().toISOString() };
    } catch (e) {
      // Metadata file doesn't exist, use new one
    }
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`✅ Metadata updated: ${metadataPath}`);
  } catch (e) {
    console.warn('⚠️  Could not update metadata:', e);
  }
}

// Run
extractAllData().catch(error => {
  console.error('❌ Extraction failed:', error);
  process.exit(1);
});

