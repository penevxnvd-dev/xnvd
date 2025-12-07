// Hardcoded data for offline fallback
// Generated: 2025-12-07T19:39:09.887Z
// This file contains all necessary data for offline functionality
// Data is base64 encoded to reduce file size and obfuscate slightly

// Obfuscated data (base64 encoded JSON)
const _d = 'eyJ2ZXJzaW9uIjoiMS4wLjAiLCJnZW5lcmF0ZWRfYXQiOiIyMDI1LTEyLTA3VDIwOjI5OjM5LjIzNloiLCJhY2NvdW50cyI6eyJhZG1pbkB4bnZkLmNvbSI6eyJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsImVtYWlsIjoiYWRtaW5AeG52ZC5jb20iLCJwYXNzd29yZCI6IkFkbWluMTIzISIsImZ1bGxfbmFtZSI6ItCQ0LTQvNC40L3QuNGB0YLRgNCw0YLQvtGAIn19LCJzdHJ1Y3R1cmUiOltdLCJjb3VudHJpZXMiOltdLCJjaXRpZXMiOltdLCJvZmZpY2VzIjpbXSwidGVhbXMiOltdLCJwcm9maWxlcyI6W3siaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJmdWxsX25hbWUiOiLQkNC00LzQuNC90LjRgdGC0YDQsNGC0L7RgCIsImVtYWlsIjoiYWRtaW5AeG52ZC5jb20iLCJjcmVhdGVkX2F0IjoiMjAyNS0xMi0wN1QyMDoyOTozOS4yMzZaIiwidXBkYXRlZF9hdCI6IjIwMjUtMTItMDdUMjA6Mjk6MzkuMjM2WiJ9XSwidXNlcl9yb2xlcyI6W3siaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDIiLCJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwicm9sZSI6ImFkbWluIiwiY3JlYXRlZF9hdCI6IjIwMjUtMTItMDdUMjA6Mjk6MzkuMjM2WiJ9XSwicmVhbHRvcnMiOltdfQ==';

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
