#!/usr/bin/env node

/**
 * Generate hardcoded data file for frontend fallback
 * This extracts all necessary data and creates an embedded data file
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read all backup data files
function loadBackupData() {
  const backupDir = join(rootDir, 'public/local-backup/data');
  
  const data = {
    countries: JSON.parse(readFileSync(join(backupDir, 'countries.json'), 'utf8')),
    cities: JSON.parse(readFileSync(join(backupDir, 'cities.json'), 'utf8')),
    offices: JSON.parse(readFileSync(join(backupDir, 'offices.json'), 'utf8')),
    teams: JSON.parse(readFileSync(join(backupDir, 'teams.json'), 'utf8')),
    profiles: JSON.parse(readFileSync(join(backupDir, 'profiles.json'), 'utf8')),
    user_roles: JSON.parse(readFileSync(join(backupDir, 'user_roles.json'), 'utf8')),
    realtors: JSON.parse(readFileSync(join(backupDir, 'realtors.json'), 'utf8')),
  };
  
  return data;
}

// Obfuscate data slightly (simple encoding, not real encryption)
function obfuscate(str) {
  // Simple base64-like encoding with rotation
  return Buffer.from(str).toString('base64');
}

function deobfuscate(str) {
  return Buffer.from(str, 'base64').toString('utf8');
}

// Generate hardcoded data file
function generateHardcodedData() {
  console.log('📦 Loading backup data...');
  const data = loadBackupData();
  
  // Create accounts map (email -> password hint and profile)
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
      realtor: realtor || null,
    };
  });
  
  // Create structure: countries -> cities -> offices -> teams -> team leaders
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
    // Flat lists for quick lookup
    countries: data.countries,
    cities: data.cities,
    offices: data.offices,
    teams: data.teams,
    profiles: data.profiles,
    user_roles: data.user_roles,
    realtors: data.realtors,
  };
  
  // Convert to string and minify
  const jsonString = JSON.stringify(hardcodedData);
  
  // Create TypeScript file with embedded data
  const tsContent = `// Hardcoded data for offline fallback
// Generated: ${new Date().toISOString()}
// This file contains all necessary data for offline functionality

// Obfuscated data (base64 encoded JSON)
const _d = '${Buffer.from(jsonString).toString('base64')}';

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
`;

  // Write TypeScript file
  const outputPath = join(rootDir, 'src/lib/hardcodedData.ts');
  writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log(`✅ Hardcoded data file generated: ${outputPath}`);
  console.log(`   Accounts: ${Object.keys(accounts).length}`);
  console.log(`   Countries: ${data.countries.length}`);
  console.log(`   Cities: ${data.cities.length}`);
  console.log(`   Offices: ${data.offices.length}`);
  console.log(`   Teams: ${data.teams.length}`);
  console.log(`   Profiles: ${data.profiles.length}`);
  console.log(`   Realtors: ${data.realtors.length}`);
  console.log(`   Data size: ${(jsonString.length / 1024).toFixed(2)} KB`);
}

// Run
generateHardcodedData();

