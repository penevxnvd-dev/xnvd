// Supabase-based API client - loads data directly from Supabase
// Priority: 1. Supabase (primary), 2. Local backup (fallback)
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { handleSupabaseError } from './errorHandler';
import { withLocalBackupFirst } from './localBackup';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

/**
 * Helper function: Try hardcoded data first, then local backup, then Supabase
 * Priority: 1. Hardcoded, 2. Local backup, 3. Supabase (fallback only)
 */
async function withLocalBackupFirst<T>(
  tableName: string,
  getHardcoded: () => T[],
  getHardcodedFiltered?: (filter: (item: T) => boolean) => T[],
  filter?: (item: T) => boolean,
  supabaseCall?: () => Promise<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[]; fromHardcoded: boolean; fromBackup: boolean }> {
  // 1. Try hardcoded data first (PRIMARY source)
  try {
    let hardcodedData: T[];
    if (filter && getHardcodedFiltered) {
      hardcodedData = getHardcodedFiltered(filter);
    } else {
      hardcodedData = getHardcoded();
      if (filter) {
        hardcodedData = hardcodedData.filter(filter);
      }
    }
    
    if (hardcodedData && hardcodedData.length > 0) {
      console.info(`[withLocalBackupFirst] Using hardcoded data for ${tableName} (${hardcodedData.length} records)`);
      return {
        data: hardcodedData,
        fromHardcoded: true,
        fromBackup: false,
      };
    }
  } catch (error) {
    console.warn(`[withLocalBackupFirst] Error getting hardcoded ${tableName}:`, error);
  }

  // 2. Try local backup (SECONDARY source)
  try {
    const backupData = await localBackup.queryTable<T>(tableName, filter);
    if (backupData && backupData.length > 0) {
      console.info(`[withLocalBackupFirst] Using local backup for ${tableName} (${backupData.length} records)`);
      return {
        data: backupData,
        fromHardcoded: false,
        fromBackup: true,
      };
    }
  } catch (error) {
    console.warn(`[withLocalBackupFirst] Error getting local backup for ${tableName}:`, error);
  }

  // 3. Try Supabase (FALLBACK only)
  if (supabaseCall) {
    try {
      console.info(`[withLocalBackupFirst] Hardcoded and backup empty for ${tableName}, trying Supabase...`);
      const result = await supabaseCall();
      if (!result.error && result.data && result.data.length > 0) {
        console.info(`[withLocalBackupFirst] Using Supabase for ${tableName} (${result.data.length} records)`);
        return {
          data: result.data,
          fromHardcoded: false,
          fromBackup: false,
        };
      }
    } catch (error) {
      console.warn(`[withLocalBackupFirst] Error getting Supabase data for ${tableName}:`, error);
    }
  }

  // All sources failed or empty - return empty array
  console.info(`[withLocalBackupFirst] All sources empty for ${tableName}, returning empty array`);
  return {
    data: [],
    fromHardcoded: false,
    fromBackup: false,
  };
}

class SupabaseApiClient {
  // Expose supabase client
  get supabase() {
    return supabase;
  }

  // Auth methods - using Supabase directly
  async login(email: string, password: string) {
    const attemptLogin = async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized. Please check environment variables.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.status === 400 || error.message.includes('Invalid login credentials') || error.message.includes('invalid_grant')) {
          throw new Error('Невалиден имейл или парола. Моля проверете данните си.');
        }
        
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          throw new Error('Моля потвърдете имейла си преди да влезете.');
        }
        
        throw handleSupabaseError(error);
      }

      if (!data.user || !data.session) {
        throw new Error('Неуспешно влизане. Моля опитайте отново.');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn('[Login] Profile not found, using user metadata');
      }

      const fullName = profile?.full_name || data.user.user_metadata?.full_name || email;

      return {
        user: {
          ...data.user,
          ...(profile || { full_name: fullName, email }),
        },
        session: data.session,
      };
    };

    try {
      return await attemptLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(message || 'Грешка при влизане. Моля опитайте отново.');
    }
  }

  async register(email: string, password: string, fullName: string) {
    // Registration always goes to Supabase (can't hardcode new users)
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check environment variables.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('Потребител с този имейл вече съществува.');
      }
      throw handleSupabaseError(error);
    }

    if (!data.user) {
      throw new Error('Неуспешна регистрация. Моля опитайте отново.');
    }

    return {
      user: {
        ...data.user,
        user_metadata: {
          full_name: fullName,
        },
      },
      session: data.session,
    };
  }

  async logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  async getCurrentUser() {
    // Get user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: {
        ...user,
        ...profile,
      },
    };
  }

  // Countries - Supabase first, then local backup
  async getCountries() {
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.warn('[getCountries] Supabase error, trying local backup:', error.message);
        // Fallback to local backup
        const backupData = await withLocalBackupFirst(
          'countries',
          () => [],
          undefined,
          undefined,
          async () => ({ data: null, error })
        );
        return (backupData.data as Tables<'countries'>[]) || [];
      }
      
      if (data && data.length > 0) {
        return data as Tables<'countries'>[];
      }
      
      // If Supabase returns empty, try local backup
      const backupData = await withLocalBackupFirst(
        'countries',
        () => [],
        undefined,
        undefined,
        async () => ({ data: [], error: null })
      );
      return (backupData.data as Tables<'countries'>[]) || [];
    } catch (error) {
      console.error('[getCountries] Error:', error);
      // Final fallback to local backup
      const backupData = await withLocalBackupFirst(
        'countries',
        () => [],
        undefined,
        undefined,
        async () => ({ data: null, error })
      );
      return (backupData.data as Tables<'countries'>[]) || [];
    }
  }

  // Cities - Supabase first, then local backup
  async getCitiesByCountry(countryId: string) {
    const result = await withLocalBackupFirst(
      'cities',
      async () => {
        const { data, error } = await supabase
          .from('cities')
          .select('*')
          .eq('country_id', countryId)
          .order('name', { ascending: true });
        return { data, error };
      },
      (city) => (city as { country_id?: string }).country_id === countryId
    );
    if (result.error && !result.fromCache) {
      throw handleSupabaseError(result.error);
    }
    return (result.data as Tables<'cities'>[]) || [];
  }

  // Offices - Supabase first, then local backup
  async getOfficesByCity(cityId: string) {
    const result = await withLocalBackupFirst(
      'offices',
      async () => {
        const { data, error } = await supabase
          .from('offices')
          .select('*')
          .eq('city_id', cityId)
          .order('name', { ascending: true });
        return { data, error };
      },
      (office) => (office as { city_id?: string }).city_id === cityId
    );
    if (result.error && !result.fromCache) {
      throw handleSupabaseError(result.error);
    }
    return (result.data as Tables<'offices'>[]) || [];
  }

  async getAllOffices() {
    return withLocalBackupFirst(
      'offices',
      () => [],
      undefined,
      async () => {
        const { data, error } = await supabase
          .from('offices')
          .select('*')
          .order('name', { ascending: true });
        return { data, error };
      }
    ).then(result => result.data as Tables<'offices'>[]);
  }

  async getAllOfficesFull() {
    const offices = await this.getAllOffices();
    // Enrich with city and country data
    const enriched = await Promise.all(offices.map(async (office) => {
      const cities = await this.getCitiesByCountry(''); // Get all cities
      const city = cities.find(c => c.id === office.city_id);
      const countries = await this.getCountries();
      const country = city ? countries.find(co => co.id === city.country_id) : null;
      
      return {
        ...office,
        city: city ? { ...city, country } : null,
      };
    }));
    return enriched;
  }

  async getOfficeFull(officeId: string) {
    const offices = await this.getAllOfficesFull();
    return offices.find(o => o.id === officeId) || null;
  }

  // Teams - hardcoded first, then backup, then Supabase
  async getTeamsByOffice(officeId: string) {
    return withLocalBackupFirst(
      'teams',
      () => [],
      (team) => (team as { office_id?: string }).office_id === officeId,
      async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('office_id', officeId)
          .order('name', { ascending: true });
        return { data, error };
      }
    ).then(result => result.data as Tables<'teams'>[]);
  }

  // Realtors - hardcoded first, then backup, then Supabase
  async getRealtorsByTeam(teamId: string) {
    return withLocalBackupFirst(
      'realtors',
      () => [],
      (realtor) => (realtor as { team_id?: string }).team_id === teamId,
      async () => {
        const { data, error } = await supabase
          .from('realtors')
          .select('*')
          .eq('team_id', teamId)
          .order('level', { ascending: false });
        return { data, error };
      }
    ).then(result => result.data as Tables<'realtors'>[]);
  }

  async getAllTeamLeaders() {
    const teams = await withLocalBackupFirst(
      'teams',
      () => [],
      undefined,
      async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('*');
        return { data, error };
      }
    ).then(result => result.data);

    const leaderIds = teams
      .map(t => (t as { leader_id?: string }).leader_id)
      .filter((id): id is string => !!id);
    
    const profiles = [];
    return profiles.filter(p => leaderIds.includes(p.id));
  }

  async getAvailableProfilesForTeam(teamId: string) {
    const teamRealtors = await this.getRealtorsByTeam(teamId);
    const allProfiles = [];
    const assignedIds = new Set(teamRealtors.map(r => (r as { user_id?: string }).user_id));
    return allProfiles.filter(p => !assignedIds.has(p.id));
  }

  async getCurrentRealtor(userId: string) {
    const realtors = [];
    const realtor = realtors.find(r => (r as { user_id?: string }).user_id === userId);
    if (realtor) {
      return realtor as Tables<'realtors'>;
    }
    
    // Try Supabase
    const { data, error } = await supabase
      .from('realtors')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Deals - hardcoded first, then backup, then Supabase
  async getMyDeals(userId: string) {
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    return withLocalBackupFirst(
      'deals',
      () => [],
      (deal) => (deal as { realtor_id?: string }).realtor_id === realtor.id,
      async () => {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .eq('realtor_id', realtor.id)
          .order('deal_date', { ascending: false });
        return { data, error };
      }
    ).then(result => result.data as Tables<'deals'>[]);
  }

  // Diagnoses - hardcoded first, then backup, then Supabase
  async getMyDiagnoses(userId: string) {
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    return withLocalBackupFirst(
      'diagnoses',
      () => [],
      (diagnosis) => (diagnosis as { realtor_id?: string }).realtor_id === realtor.id,
      async () => {
        const { data, error } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('realtor_id', realtor.id)
          .order('diagnosis_date', { ascending: false });
        return { data, error };
      }
    ).then(result => result.data as Tables<'diagnoses'>[]);
  }

  // Training Progress - hardcoded first, then backup, then Supabase
  async getTrainingProgress(userId: string) {
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    return withLocalBackupFirst(
      'training_progress',
      () => [],
      (progress) => (progress as { realtor_id?: string }).realtor_id === realtor.id,
      async () => {
        const { data, error } = await supabase
          .from('training_progress')
          .select('*')
          .eq('realtor_id', realtor.id);
        return { data, error };
      }
    ).then(result => result.data as Tables<'training_progress'>[]);
  }

  // Realtor Goals - hardcoded first, then backup, then Supabase
  async getRealtorKPI(userId: string) {
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) {
      return {
        deals: 0,
        keys: 0,
        exclusives: 0,
        revenue: 0,
      };
    }

    const deals = await this.getMyDeals(userId);
    const goals = await withLocalBackupFirst(
      'realtor_goals',
      () => [],
      (goal) => (goal as { realtor_id?: string }).realtor_id === realtor.id,
      async () => {
        const { data, error } = await supabase
          .from('realtor_goals')
          .select('*')
          .eq('realtor_id', realtor.id);
        return { data, error };
      }
    ).then(result => result.data);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentGoal = goals.find((g: unknown) => {
      const goal = g as { month?: number; year?: number };
      return goal.month === currentMonth && goal.year === currentYear;
    });

    const totalDeals = deals.length;
    const keys = deals.filter((d: unknown) => (d as { is_key?: boolean }).is_key).length;
    const exclusives = deals.filter((d: unknown) => (d as { is_exclusive?: boolean }).is_exclusive).length;
    const revenue = deals.reduce((sum: number, d: unknown) => {
      const deal = d as { deal_value?: string };
      return sum + (parseFloat(deal.deal_value || '0'));
    }, 0);

    return {
      deals: totalDeals,
      keys,
      exclusives,
      revenue,
      goal: currentGoal ? {
        deals: (currentGoal as { deals_goal?: number }).deals_goal || 0,
        keys: (currentGoal as { keys_goal?: number }).keys_goal || 0,
        exclusives: (currentGoal as { exclusives_goal?: number }).exclusives_goal || 0,
      } : null,
    };
  }

  async getTeamKPI(teamId: string) {
    const realtors = await this.getRealtorsByTeam(teamId);
    const kpis = await Promise.all(realtors.map(r => this.getRealtorKPI((r as { user_id?: string }).user_id || '')));
    
    return {
      deals: kpis.reduce((sum, kpi) => sum + kpi.deals, 0),
      keys: kpis.reduce((sum, kpi) => sum + kpi.keys, 0),
      exclusives: kpis.reduce((sum, kpi) => sum + kpi.exclusives, 0),
      revenue: kpis.reduce((sum, kpi) => sum + kpi.revenue, 0),
    };
  }

  async getOfficeKPI(officeId: string) {
    const teams = await this.getTeamsByOffice(officeId);
    const kpis = await Promise.all(teams.map(t => this.getTeamKPI(t.id)));
    
    return {
      deals: kpis.reduce((sum, kpi) => sum + kpi.deals, 0),
      keys: kpis.reduce((sum, kpi) => sum + kpi.keys, 0),
      exclusives: kpis.reduce((sum, kpi) => sum + kpi.exclusives, 0),
      revenue: kpis.reduce((sum, kpi) => sum + kpi.revenue, 0),
    };
  }

  async getCityKPI(cityId: string) {
    const offices = await this.getOfficesByCity(cityId);
    const kpis = await Promise.all(offices.map(o => this.getOfficeKPI(o.id)));
    
    return {
      deals: kpis.reduce((sum, kpi) => sum + kpi.deals, 0),
      keys: kpis.reduce((sum, kpi) => sum + kpi.keys, 0),
      exclusives: kpis.reduce((sum, kpi) => sum + kpi.exclusives, 0),
      revenue: kpis.reduce((sum, kpi) => sum + kpi.revenue, 0),
    };
  }

  // Buyer Schedule - hardcoded first, then backup, then Supabase
  async getBuyerSchedule(userId: string) {
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    return withLocalBackupFirst(
      'buyer_schedule',
      () => [],
      (schedule) => (schedule as { realtor_id?: string }).realtor_id === realtor.id,
      async () => {
        const { data, error } = await supabase
          .from('buyer_schedule')
          .select('*')
          .eq('realtor_id', realtor.id)
          .order('schedule_date', { ascending: true });
        return { data, error };
      }
    ).then(result => result.data as Tables<'buyer_schedule'>[]);
  }

  // Messages - hardcoded first, then backup, then Supabase
  async getMessages(userId: string) {
    return withLocalBackupFirst(
      'messages',
      () => [],
      (msg) => {
        const message = msg as { sender_id?: string; receiver_id?: string };
        return message.sender_id === userId || message.receiver_id === userId;
      },
      async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false });
        return { data, error };
      }
    ).then(result => result.data as Tables<'messages'>[]);
  }

  // Write operations always go to Supabase (can't hardcode writes)
  async createCity(data: { name: string; countryId: string }) {
    const { data: city, error } = await supabase
      .from('cities')
      .insert({ name: data.name, country_id: data.countryId })
      .select()
      .single();

    if (error) throw error;
    return city;
  }

  async updateCity(id: string, data: { name: string }) {
    const { data: city, error } = await supabase
      .from('cities')
      .update({ name: data.name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return city;
  }

  async deleteCity(id: string) {
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async createOffice(data: { name: string; cityId: string; address?: string }) {
    const { data: office, error } = await supabase
      .from('offices')
      .insert({ name: data.name, city_id: data.cityId, address: data.address })
      .select()
      .single();

    if (error) throw error;
    return office;
  }

  async updateOffice(id: string, data: { name?: string; address?: string }) {
    const { data: office, error } = await supabase
      .from('offices')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return office;
  }

  async deleteOffice(id: string) {
    const { error } = await supabase
      .from('offices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async createTeam(data: { name: string; officeId: string; leaderId?: string }) {
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name: data.name, office_id: data.officeId, leader_id: data.leaderId })
      .select()
      .single();

    if (error) throw error;
    return team;
  }

  async updateTeam(id: string, data: { name?: string; leaderId?: string }) {
    const { data: team, error } = await supabase
      .from('teams')
      .update({ name: data.name, leader_id: data.leaderId })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return team;
  }

  async deleteTeam(id: string) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async createRealtor(data: { userId: string; teamId?: string; level?: number }) {
    const { data: realtor, error } = await supabase
      .from('realtors')
      .insert({
        user_id: data.userId,
        team_id: data.teamId,
        level: data.level || 1,
      })
      .select()
      .single();

    if (error) throw error;
    return realtor;
  }

  async updateRealtor(id: string, data: { teamId?: string; level?: number }) {
    const { data: realtor, error } = await supabase
      .from('realtors')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return realtor;
  }

  async deleteRealtor(id: string) {
    const { error } = await supabase
      .from('realtors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async createDeal(data: {
    realtorId: string;
    clientName: string;
    dealValue: number;
    commission?: number;
    dealDate?: string;
    isKey?: boolean;
    isExclusive?: boolean;
  }) {
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        realtor_id: data.realtorId,
        client_name: data.clientName,
        deal_value: data.dealValue,
        commission: data.commission,
        deal_date: data.dealDate,
        is_key: data.isKey,
        is_exclusive: data.isExclusive,
      })
      .select()
      .single();

    if (error) throw error;
    return deal;
  }

  async updateDeal(id: string, data: {
    clientName?: string;
    dealValue?: number;
    commission?: number;
    dealDate?: string;
    isKey?: boolean;
    isExclusive?: boolean;
  }) {
    const { data: deal, error } = await supabase
      .from('deals')
      .update({
        client_name: data.clientName,
        deal_value: data.dealValue,
        commission: data.commission,
        deal_date: data.dealDate,
        is_key: data.isKey,
        is_exclusive: data.isExclusive,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return deal;
  }

  async deleteDeal(id: string) {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async createDiagnosis(data: {
    realtorId: string;
    clientName: string;
    diagnosisDate?: string;
    status?: string;
    notes?: string;
  }) {
    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .insert({
        realtor_id: data.realtorId,
        client_name: data.clientName,
        diagnosis_date: data.diagnosisDate,
        status: data.status || 'active',
        notes: data.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return diagnosis;
  }

  async updateDiagnosis(id: string, data: {
    clientName?: string;
    diagnosisDate?: string;
    status?: string;
    notes?: string;
  }) {
    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return diagnosis;
  }

  async deleteDiagnosis(id: string) {
    const { error } = await supabase
      .from('diagnoses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async updateTrainingProgress(data: {
    realtorId: string;
    section: string;
    subsection: string;
    lectureCompleted?: boolean;
    videoCompleted?: boolean;
    practicalCompleted?: boolean;
    handoverCompleted?: boolean;
    examCompleted?: boolean;
  }) {
    const { data: progress, error } = await supabase
      .from('training_progress')
      .upsert({
        realtor_id: data.realtorId,
        section: data.section,
        subsection: data.subsection,
        lecture_completed: data.lectureCompleted,
        video_completed: data.videoCompleted,
        practical_completed: data.practicalCompleted,
        handover_completed: data.handoverCompleted,
        exam_completed: data.examCompleted,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return progress;
  }

  async updateRealtorGoals(data: {
    realtorId: string;
    month: number;
    year: number;
    dealsGoal?: number;
    keysGoal?: number;
    exclusivesGoal?: number;
  }) {
    const { data: goal, error } = await supabase
      .from('realtor_goals')
      .upsert({
        realtor_id: data.realtorId,
        month: data.month,
        year: data.year,
        deals_goal: data.dealsGoal,
        keys_goal: data.keysGoal,
        exclusives_goal: data.exclusivesGoal,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return goal;
  }

  async createBuyerSchedule(data: {
    realtorId: string;
    scheduleDate: string;
    timeSlot: string;
    buyer1Name?: string;
    buyer1Phone?: string;
    buyer1Notes?: string;
    buyer2Name?: string;
    buyer2Phone?: string;
    buyer2Notes?: string;
  }) {
    const { data: schedule, error } = await supabase
      .from('buyer_schedule')
      .insert({
        realtor_id: data.realtorId,
        schedule_date: data.scheduleDate,
        time_slot: data.timeSlot,
        buyer1_name: data.buyer1Name,
        buyer1_phone: data.buyer1Phone,
        buyer1_notes: data.buyer1Notes,
        buyer2_name: data.buyer2Name,
        buyer2_phone: data.buyer2Phone,
        buyer2_notes: data.buyer2Notes,
      })
      .select()
      .single();

    if (error) throw error;
    return schedule;
  }

  async updateBuyerSchedule(id: string, data: {
    scheduleDate?: string;
    timeSlot?: string;
    buyer1Name?: string;
    buyer1Phone?: string;
    buyer1Notes?: string;
    buyer2Name?: string;
    buyer2Phone?: string;
    buyer2Notes?: string;
  }) {
    const { data: schedule, error } = await supabase
      .from('buyer_schedule')
      .update({
        schedule_date: data.scheduleDate,
        time_slot: data.timeSlot,
        buyer1_name: data.buyer1Name,
        buyer1_phone: data.buyer1Phone,
        buyer1_notes: data.buyer1Notes,
        buyer2_name: data.buyer2Name,
        buyer2_phone: data.buyer2Phone,
        buyer2_notes: data.buyer2Notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return schedule;
  }

  async deleteBuyerSchedule(id: string) {
    const { error } = await supabase
      .from('buyer_schedule')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async sendMessage(data: {
    receiverId: string;
    content: string;
  }) {
    const user = await this.getCurrentUser();
    if (!user.user) {
      throw new Error('Not authenticated');
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.user.id,
        receiver_id: data.receiverId,
        content: data.content,
      })
      .select()
      .single();

    if (error) throw error;
    return message;
  }

  async markMessageAsRead(messageId: string) {
    const { data: message, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return message;
  }

  async updateProfile(fullName: string) {
    const user = await this.getCurrentUser();
    if (!user.user) {
      throw new Error('Not authenticated');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.user.id)
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    const user = await this.getCurrentUser();
    if (!user.user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { success: true };
  }
}

export const supabaseApi = new SupabaseApiClient();
