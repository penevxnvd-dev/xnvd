import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Липсват Supabase environment variables!');
  console.error('Моля, проверете дали SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY са зададени в .env файла.');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const prisma = new PrismaClient();

interface SyncStats {
  profiles: number;
  userRoles: number;
  countries: number;
  cities: number;
  offices: number;
  teams: number;
  realtors: number;
  deals: number;
  diagnoses: number;
  trainingProgress: number;
  realtorGoals: number;
  buyerSchedule: number;
  errors: string[];
}

async function syncProfiles(): Promise<number> {
  console.log('📥 Синхронизиране на profiles...');
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма profiles в Supabase');
    return 0;
  }

  let count = 0;
  for (const profile of data) {
    try {
      await prisma.profile.upsert({
        where: { id: profile.id },
        update: {
          fullName: profile.full_name,
          email: profile.email,
          updatedAt: new Date(profile.updated_at || profile.created_at),
        },
        create: {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          createdAt: new Date(profile.created_at),
          updatedAt: new Date(profile.updated_at || profile.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на profile ${profile.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} profiles`);
  return count;
}

async function syncUserRoles(): Promise<number> {
  console.log('📥 Синхронизиране на user_roles...');
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма user_roles в Supabase');
    return 0;
  }

  let count = 0;
  for (const role of data) {
    try {
      await prisma.userRole.upsert({
        where: { id: role.id },
        update: {
          userId: role.user_id,
          role: role.role as 'admin' | 'realtor',
        },
        create: {
          id: role.id,
          userId: role.user_id,
          role: role.role as 'admin' | 'realtor',
          createdAt: new Date(role.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на user_role ${role.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} user_roles`);
  return count;
}

async function syncCountries(): Promise<number> {
  console.log('📥 Синхронизиране на countries...');
  const { data, error } = await supabaseAdmin
    .from('countries')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма countries в Supabase');
    return 0;
  }

  let count = 0;
  for (const country of data) {
    try {
      await prisma.country.upsert({
        where: { id: country.id },
        update: {
          name: country.name,
          code: country.code,
        },
        create: {
          id: country.id,
          name: country.name,
          code: country.code,
          createdAt: new Date(country.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на country ${country.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} countries`);
  return count;
}

async function syncCities(): Promise<number> {
  console.log('📥 Синхронизиране на cities...');
  const { data, error } = await supabaseAdmin
    .from('cities')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма cities в Supabase');
    return 0;
  }

  let count = 0;
  for (const city of data) {
    try {
      await prisma.city.upsert({
        where: { id: city.id },
        update: {
          name: city.name,
          countryId: city.country_id,
        },
        create: {
          id: city.id,
          name: city.name,
          countryId: city.country_id,
          createdAt: new Date(city.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на city ${city.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} cities`);
  return count;
}

async function syncOffices(): Promise<number> {
  console.log('📥 Синхронизиране на offices...');
  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма offices в Supabase');
    return 0;
  }

  let count = 0;
  for (const office of data) {
    try {
      await prisma.office.upsert({
        where: { id: office.id },
        update: {
          name: office.name,
          cityId: office.city_id,
          address: office.address || null,
        },
        create: {
          id: office.id,
          name: office.name,
          cityId: office.city_id,
          address: office.address || null,
          createdAt: new Date(office.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на office ${office.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} offices`);
  return count;
}

async function syncTeams(): Promise<number> {
  console.log('📥 Синхронизиране на teams...');
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма teams в Supabase');
    return 0;
  }

  let count = 0;
  for (const team of data) {
    try {
      await prisma.team.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          officeId: team.office_id,
          leaderId: team.leader_id || null,
        },
        create: {
          id: team.id,
          name: team.name,
          officeId: team.office_id,
          leaderId: team.leader_id || null,
          createdAt: new Date(team.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на team ${team.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} teams`);
  return count;
}

async function syncRealtors(): Promise<number> {
  console.log('📥 Синхронизиране на realtors...');
  const { data, error } = await supabaseAdmin
    .from('realtors')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма realtors в Supabase');
    return 0;
  }

  let count = 0;
  for (const realtor of data) {
    try {
      await prisma.realtor.upsert({
        where: { id: realtor.id },
        update: {
          userId: realtor.user_id,
          teamId: realtor.team_id || null,
          level: realtor.level || 1,
          hireDate: new Date(realtor.hire_date),
          confidence: realtor.confidence || false,
          salesResilience: realtor.sales_resilience || false,
          successMindset: realtor.success_mindset || false,
          updatedAt: new Date(realtor.updated_at || realtor.created_at),
        },
        create: {
          id: realtor.id,
          userId: realtor.user_id,
          teamId: realtor.team_id || null,
          level: realtor.level || 1,
          hireDate: new Date(realtor.hire_date),
          confidence: realtor.confidence || false,
          salesResilience: realtor.sales_resilience || false,
          successMindset: realtor.success_mindset || false,
          createdAt: new Date(realtor.created_at),
          updatedAt: new Date(realtor.updated_at || realtor.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на realtor ${realtor.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} realtors`);
  return count;
}

async function syncDeals(): Promise<number> {
  console.log('📥 Синхронизиране на deals...');
  const { data, error } = await supabaseAdmin
    .from('deals')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма deals в Supabase');
    return 0;
  }

  let count = 0;
  for (const deal of data) {
    try {
      await prisma.deal.upsert({
        where: { id: deal.id },
        update: {
          realtorId: deal.realtor_id,
          clientName: deal.client_name,
          dealValue: deal.deal_value,
          commission: deal.commission || null,
          dealDate: new Date(deal.deal_date),
          isKey: deal.is_key || false,
          isExclusive: deal.is_exclusive || false,
        },
        create: {
          id: deal.id,
          realtorId: deal.realtor_id,
          clientName: deal.client_name,
          dealValue: deal.deal_value,
          commission: deal.commission || null,
          dealDate: new Date(deal.deal_date),
          isKey: deal.is_key || false,
          isExclusive: deal.is_exclusive || false,
          createdAt: new Date(deal.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на deal ${deal.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} deals`);
  return count;
}

async function syncDiagnoses(): Promise<number> {
  console.log('📥 Синхронизиране на diagnoses...');
  const { data, error } = await supabaseAdmin
    .from('diagnoses')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма diagnoses в Supabase');
    return 0;
  }

  let count = 0;
  for (const diagnosis of data) {
    try {
      await prisma.diagnosis.upsert({
        where: { id: diagnosis.id },
        update: {
          realtorId: diagnosis.realtor_id,
          clientName: diagnosis.client_name,
          diagnosisDate: new Date(diagnosis.diagnosis_date),
          status: diagnosis.status || 'active',
          notes: diagnosis.notes || null,
        },
        create: {
          id: diagnosis.id,
          realtorId: diagnosis.realtor_id,
          clientName: diagnosis.client_name,
          diagnosisDate: new Date(diagnosis.diagnosis_date),
          status: diagnosis.status || 'active',
          notes: diagnosis.notes || null,
          createdAt: new Date(diagnosis.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на diagnosis ${diagnosis.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} diagnoses`);
  return count;
}

async function syncTrainingProgress(): Promise<number> {
  console.log('📥 Синхронизиране на training_progress...');
  const { data, error } = await supabaseAdmin
    .from('training_progress')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма training_progress в Supabase');
    return 0;
  }

  let count = 0;
  for (const progress of data) {
    try {
      await prisma.trainingProgress.upsert({
        where: {
          realtorId_section_subsection: {
            realtorId: progress.realtor_id,
            section: progress.section,
            subsection: progress.subsection,
          },
        },
        update: {
          lectureCompleted: progress.lecture_completed || false,
          videoCompleted: progress.video_completed || false,
          practicalCompleted: progress.practical_completed || false,
          handoverCompleted: progress.handover_completed || false,
          examCompleted: progress.exam_completed || false,
          updatedAt: new Date(progress.updated_at),
        },
        create: {
          id: progress.id,
          realtorId: progress.realtor_id,
          section: progress.section,
          subsection: progress.subsection,
          lectureCompleted: progress.lecture_completed || false,
          videoCompleted: progress.video_completed || false,
          practicalCompleted: progress.practical_completed || false,
          handoverCompleted: progress.handover_completed || false,
          examCompleted: progress.exam_completed || false,
          updatedAt: new Date(progress.updated_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на training_progress ${progress.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} training_progress записи`);
  return count;
}

async function syncRealtorGoals(): Promise<number> {
  console.log('📥 Синхронизиране на realtor_goals...');
  const { data, error } = await supabaseAdmin
    .from('realtor_goals')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма realtor_goals в Supabase');
    return 0;
  }

  let count = 0;
  for (const goal of data) {
    try {
      await prisma.realtorGoal.upsert({
        where: {
          realtorId_month_year: {
            realtorId: goal.realtor_id,
            month: goal.month,
            year: goal.year,
          },
        },
        update: {
          dealsGoal: goal.deals_goal || 0,
          keysGoal: goal.keys_goal || 0,
          exclusivesGoal: goal.exclusives_goal || 0,
          updatedAt: new Date(goal.updated_at || goal.created_at),
        },
        create: {
          id: goal.id,
          realtorId: goal.realtor_id,
          month: goal.month,
          year: goal.year,
          dealsGoal: goal.deals_goal || 0,
          keysGoal: goal.keys_goal || 0,
          exclusivesGoal: goal.exclusives_goal || 0,
          createdAt: new Date(goal.created_at),
          updatedAt: new Date(goal.updated_at || goal.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на realtor_goal ${goal.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} realtor_goals`);
  return count;
}

async function syncBuyerSchedule(): Promise<number> {
  console.log('📥 Синхронизиране на buyer_schedule...');
  const { data, error } = await supabaseAdmin
    .from('buyer_schedule')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('  ℹ️  Няма buyer_schedule в Supabase');
    return 0;
  }

  let count = 0;
  for (const schedule of data) {
    try {
      await prisma.buyerSchedule.upsert({
        where: { id: schedule.id },
        update: {
          realtorId: schedule.realtor_id,
          scheduleDate: new Date(schedule.schedule_date),
          timeSlot: schedule.time_slot,
          buyer1Name: schedule.buyer1_name || null,
          buyer1Phone: schedule.buyer1_phone || null,
          buyer1Notes: schedule.buyer1_notes || null,
          buyer2Name: schedule.buyer2_name || null,
          buyer2Phone: schedule.buyer2_phone || null,
          buyer2Notes: schedule.buyer2_notes || null,
          updatedAt: new Date(schedule.updated_at || schedule.created_at),
        },
        create: {
          id: schedule.id,
          realtorId: schedule.realtor_id,
          scheduleDate: new Date(schedule.schedule_date),
          timeSlot: schedule.time_slot,
          buyer1Name: schedule.buyer1_name || null,
          buyer1Phone: schedule.buyer1_phone || null,
          buyer1Notes: schedule.buyer1_notes || null,
          buyer2Name: schedule.buyer2_name || null,
          buyer2Phone: schedule.buyer2_phone || null,
          buyer2Notes: schedule.buyer2_notes || null,
          createdAt: new Date(schedule.created_at),
          updatedAt: new Date(schedule.updated_at || schedule.created_at),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`  ❌ Грешка при синхронизация на buyer_schedule ${schedule.id}:`, err.message);
    }
  }
  console.log(`  ✅ Синхронизирани ${count} buyer_schedule записи`);
  return count;
}

async function main() {
  console.log('🚀 Започване на синхронизация от Supabase към Prisma...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);

  // Test Supabase connection
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    if (error) {
      console.error('❌ Грешка при свързване с Supabase:', error.message);
      console.error('Моля, проверете дали Supabase URL и Service Role Key са правилни.');
      process.exit(1);
    }
    console.log('✅ Успешно свързване с Supabase\n');
  } catch (err: any) {
    console.error('❌ Грешка при свързване с Supabase:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('⚠️  Supabase сървърът не е достъпен. Проверете дали използвате правилния URL.');
    }
    process.exit(1);
  }

  const stats: SyncStats = {
    profiles: 0,
    userRoles: 0,
    countries: 0,
    cities: 0,
    offices: 0,
    teams: 0,
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    trainingProgress: 0,
    realtorGoals: 0,
    buyerSchedule: 0,
    errors: [],
  };

  try {
    // Sync in order to respect foreign key constraints
    stats.profiles = await syncProfiles();
    stats.userRoles = await syncUserRoles();
    stats.countries = await syncCountries();
    stats.cities = await syncCities();
    stats.offices = await syncOffices();
    stats.teams = await syncTeams();
    stats.realtors = await syncRealtors();
    stats.deals = await syncDeals();
    stats.diagnoses = await syncDiagnoses();
    stats.trainingProgress = await syncTrainingProgress();
    stats.realtorGoals = await syncRealtorGoals();
    stats.buyerSchedule = await syncBuyerSchedule();

    console.log('\n✅ Синхронизацията завърши успешно!\n');
    console.log('📊 Статистика:');
    console.log(`  Profiles: ${stats.profiles}`);
    console.log(`  User Roles: ${stats.userRoles}`);
    console.log(`  Countries: ${stats.countries}`);
    console.log(`  Cities: ${stats.cities}`);
    console.log(`  Offices: ${stats.offices}`);
    console.log(`  Teams: ${stats.teams}`);
    console.log(`  Realtors: ${stats.realtors}`);
    console.log(`  Deals: ${stats.deals}`);
    console.log(`  Diagnoses: ${stats.diagnoses}`);
    console.log(`  Training Progress: ${stats.trainingProgress}`);
    console.log(`  Realtor Goals: ${stats.realtorGoals}`);
    console.log(`  Buyer Schedule: ${stats.buyerSchedule}`);
  } catch (error: any) {
    console.error('\n❌ Грешка при синхронизация:', error);
    stats.errors.push(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

