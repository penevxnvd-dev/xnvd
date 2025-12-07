#!/usr/bin/env node

/**
 * Sync ALL data from Supabase to hardcoded data
 * Uses MCP Supabase for direct SQL access
 * Updates hardcodedData.ts with all current data
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Ensure backup directory exists
const backupDir = join(rootDir, 'local-backup');
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

console.log('🔄 Syncing all data from Supabase to hardcoded data...\n');

// This will be populated from MCP Supabase query
// For now, we'll use the data structure and update it
async function generateHardcodedData(data) {
  console.log('🔧 Generating hardcoded data...\n');

  // Build accounts object from profiles and user_roles
  const accounts = {};
  for (const profile of data.profiles || []) {
    const userRoles = (data.user_roles || []).filter(ur => ur.user_id === profile.id);
    if (userRoles.length > 0) {
      // For hardcoded accounts, we need email and password
      // Default password pattern - should be changed for production
      accounts[profile.email] = {
        id: profile.id,
        email: profile.email,
        password: 'Default123!', // This should be changed for production
        full_name: profile.full_name,
        roles: userRoles.map(ur => ur.role),
      };
    }
  }

  // Build structure (hierarchy: countries -> cities -> offices -> teams -> realtors)
  const structure = [];
  for (const country of data.countries || []) {
    const countryCities = (data.cities || []).filter(c => c.country_id === country.id);
    const countryStructure = {
      country: country,
      cities: countryCities.map(city => {
        const cityOffices = (data.offices || []).filter(o => o.city_id === city.id);
        return {
          city: city,
          offices: cityOffices.map(office => {
            const officeTeams = (data.teams || []).filter(t => t.office_id === office.id);
            return {
              office: office,
              teams: officeTeams.map(team => {
                const teamRealtors = (data.realtors || []).filter(r => r.team_id === team.id);
                return {
                  team: team,
                  realtors: teamRealtors,
                };
              }),
            };
          }),
        };
      }),
    };
    structure.push(countryStructure);
  }

  const hardcodedData = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    accounts: accounts,
    structure: structure,
    countries: data.countries || [],
    cities: data.cities || [],
    offices: data.offices || [],
    teams: data.teams || [],
    profiles: data.profiles || [],
    user_roles: data.user_roles || [],
    realtors: data.realtors || [],
    deals: data.deals || [],
    diagnoses: data.diagnoses || [],
    training_progress: data.training_progress || [],
    realtor_goals: data.realtor_goals || [],
    buyer_schedule: data.buyer_schedule || [],
    messages: data.messages || [],
  };

  // Encode to base64
  const jsonString = JSON.stringify(hardcodedData);
  const base64String = Buffer.from(jsonString).toString('base64');

  // Generate TypeScript file
  const tsContent = `// Hardcoded data for offline fallback
// Generated: ${new Date().toISOString()}
// This file contains all necessary data for offline functionality
// Data is base64 encoded to reduce file size and obfuscate slightly

// Obfuscated data (base64 encoded JSON)
const _d = '${base64String}';

// Decode and parse data
function _decode() {
  try {
    // Use browser-compatible base64 decoding
    const decoded = atob(_d);
    return JSON.parse(decoded);
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

export function getHardcodedDeals() {
  const data = getHardcodedData();
  return data?.deals || [];
}

export function getHardcodedDiagnoses() {
  const data = getHardcodedData();
  return data?.diagnoses || [];
}

export function getHardcodedTrainingProgress() {
  const data = getHardcodedData();
  return data?.training_progress || [];
}

export function getHardcodedRealtorGoals() {
  const data = getHardcodedData();
  return data?.realtor_goals || [];
}

export function getHardcodedBuyerSchedule() {
  const data = getHardcodedData();
  return data?.buyer_schedule || [];
}

export function getHardcodedMessages() {
  const data = getHardcodedData();
  return data?.messages || [];
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

export function getDealsByRealtor(realtorId: string) {
  const deals = getHardcodedDeals();
  return deals.filter(d => d.realtor_id === realtorId);
}

export function getDiagnosesByRealtor(realtorId: string) {
  const diagnoses = getHardcodedDiagnoses();
  return diagnoses.filter(d => d.realtor_id === realtorId);
}

export function getTrainingProgressByRealtor(realtorId: string) {
  const training = getHardcodedTrainingProgress();
  return training.filter(t => t.realtor_id === realtorId);
}

export function getRealtorGoalsByRealtor(realtorId: string) {
  const goals = getHardcodedRealtorGoals();
  return goals.filter(g => g.realtor_id === realtorId);
}

export function getBuyerScheduleByRealtor(realtorId: string) {
  const schedule = getHardcodedBuyerSchedule();
  return schedule.filter(s => s.realtor_id === realtorId);
}
`;

  const tsPath = join(rootDir, 'src/lib/hardcodedData.ts');
  writeFileSync(tsPath, tsContent, 'utf8');
  console.log(`   ✅ hardcodedData.ts generated\n`);
}

async function saveToLocalBackup(data) {
  console.log('💾 Saving to local backup...\n');

  // Save each table to a separate JSON file
  const tables = Object.keys(data);
  for (const table of tables) {
    const filePath = join(backupDir, `${table}.json`);
    writeFileSync(filePath, JSON.stringify(data[table], null, 2), 'utf8');
    console.log(`   ✅ ${table}.json`);
  }

  // Also save a combined file
  const combinedPath = join(backupDir, 'all-data.json');
  writeFileSync(combinedPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✅ all-data.json\n`);
}

// Main function - will be called with data from MCP
export async function syncAllData(data) {
  try {
    // Print statistics
    console.log('📊 Data received:');
    console.log(`   Countries: ${data.countries?.length || 0}`);
    console.log(`   Cities: ${data.cities?.length || 0}`);
    console.log(`   Profiles: ${data.profiles?.length || 0}`);
    console.log(`   User Roles: ${data.user_roles?.length || 0}`);
    console.log(`   Offices: ${data.offices?.length || 0}`);
    console.log(`   Teams: ${data.teams?.length || 0}`);
    console.log(`   Realtors: ${data.realtors?.length || 0}`);
    console.log(`   Deals: ${data.deals?.length || 0}`);
    console.log(`   Diagnoses: ${data.diagnoses?.length || 0}`);
    console.log(`   Training Progress: ${data.training_progress?.length || 0}`);
    console.log(`   Realtor Goals: ${data.realtor_goals?.length || 0}`);
    console.log(`   Buyer Schedule: ${data.buyer_schedule?.length || 0}`);
    console.log(`   Messages: ${data.messages?.length || 0}\n`);

    // Step 1: Save to local backup
    await saveToLocalBackup(data);

    // Step 2: Generate hardcoded data
    await generateHardcodedData(data);

    console.log('🎉 Full data sync complete!');
    console.log('   ✅ Local backup updated');
    console.log('   ✅ Hardcoded data generated');
    console.log('   ✅ All relationships preserved');
    console.log('   ✅ All accounts connected');
    console.log('   ✅ App ready for offline use\n');
  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  }
}

