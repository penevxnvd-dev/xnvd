// Supabase-based API client - replaces Express API calls
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

class SupabaseApiClient {
  // Auth methods
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get user profile and roles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        user_roles (role)
      `)
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        roles: Array.isArray(profile.user_roles)
          ? profile.user_roles.map((ur: any) => ur.role)
          : [],
      },
      session: data.session,
    };
  }

  async register(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to create user');

    // Profile is created automatically by trigger, but we need to wait a bit
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        user_roles (role)
      `)
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        roles: Array.isArray(profile.user_roles)
          ? profile.user_roles.map((ur: any) => ur.role)
          : [],
      },
      session: data.session,
    };
  }

  async getCurrentUser() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        user_roles (role)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        roles: Array.isArray(profile.user_roles)
          ? profile.user_roles.map((ur: any) => ur.role)
          : [],
      },
    };
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Countries
  async getCountries() {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createCountry(data: { name: string; code: string }) {
    const { data: country, error } = await supabase
      .from('countries')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return country;
  }

  async updateCountry(id: string, data: { name: string; code: string }) {
    const { data: country, error } = await supabase
      .from('countries')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return country;
  }

  async deleteCountry(id: string) {
    const { error } = await supabase
      .from('countries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // Cities
  async getCitiesByCountry(countryId: string) {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('country_id', countryId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

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

  // Offices
  async getOfficesByCity(cityId: string) {
    const { data, error } = await supabase
      .from('offices')
      .select('*')
      .eq('city_id', cityId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getAllOfficesFull() {
    const { data: offices, error: officesError } = await supabase
      .from('offices')
      .select(`
        *,
        city:cities (
          *,
          country:countries (*)
        )
      `)
      .order('name', { ascending: true });

    if (officesError) throw officesError;

    // Get teams for all offices
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey (
          *,
          realtor:realtors (*)
        ),
        realtors:realtors (
          *,
          profile:profiles!realtors_user_id_fkey (*),
          deals:deals (*),
          diagnoses:diagnoses (*)
        )
      `);

    if (teamsError) throw teamsError;

    // Group teams by office_id
    const teamsByOffice = (allTeams || []).reduce((acc: any, team: any) => {
      if (!acc[team.office_id]) {
        acc[team.office_id] = [];
      }
      acc[team.office_id].push(team);
      return acc;
    }, {});

    // Attach teams to offices
    return (offices || []).map((office: any) => ({
      ...office,
      teams: teamsByOffice[office.id] || [],
    }));
  }

  async getOfficeFull(officeId: string) {
    const { data: office, error: officeError } = await supabase
      .from('offices')
      .select(`
        *,
        city:cities (
          *,
          country:countries (*)
        )
      `)
      .eq('id', officeId)
      .single();

    if (officeError) throw officeError;

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey (
          *,
          realtor:realtors (*)
        ),
        realtors:realtors (
          *,
          profile:profiles!realtors_user_id_fkey (*),
          deals:deals (*),
          diagnoses:diagnoses (*)
        )
      `)
      .eq('office_id', officeId);

    if (teamsError) throw teamsError;

    return {
      ...office,
      teams: teams || [],
    };
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

  async updateOffice(id: string, data: { name: string; address?: string }) {
    const { data: office, error } = await supabase
      .from('offices')
      .update({ name: data.name, address: data.address })
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

  // Teams
  async getTeamsByOffice(officeId: string) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('office_id', officeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
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

  async updateTeam(id: string, data: { name: string; leaderId?: string }) {
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

  // Realtors
  async getRealtorsByTeam(teamId: string) {
    const { data, error } = await supabase
      .from('realtors')
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('team_id', teamId)
      .order('level', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getCurrentRealtor() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: realtor, error } = await supabase
      .from('realtors')
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    if (!realtor) throw new Error('Realtor not found');

    return {
      ...realtor,
      salesResilience: realtor.sales_resilience || false,
      successMindset: realtor.success_mindset || false,
      user: {
        fullName: realtor.profile?.full_name || '',
        email: realtor.profile?.email || '',
      },
    };
  }

  // Deals
  async getMyDeals() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .eq('realtor_id', realtor.id)
      .gte('deal_date', startOfMonth.toISOString().split('T')[0])
      .order('deal_date', { ascending: false });

    if (error) throw error;
    return deals || [];
  }

  async createDeal(data: {
    clientName: string;
    dealValue: number;
    commission?: number;
    dealDate?: string;
  }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        realtor_id: realtor.id,
        client_name: data.clientName,
        deal_value: data.dealValue,
        commission: data.commission || null,
        deal_date: data.dealDate || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return deal;
  }

  // Diagnoses
  async getMyDiagnoses() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: diagnoses, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('realtor_id', realtor.id)
      .gte('diagnosis_date', startOfMonth.toISOString().split('T')[0])
      .order('diagnosis_date', { ascending: false });

    if (error) throw error;
    return diagnoses || [];
  }

  async createDiagnosis(data: {
    clientName: string;
    status?: string;
    notes?: string;
    diagnosisDate?: string;
  }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .insert({
        realtor_id: realtor.id,
        client_name: data.clientName,
        status: data.status || 'active',
        notes: data.notes || null,
        diagnosis_date: data.diagnosisDate || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return diagnosis;
  }

  // Training
  async getTrainingProgress() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    const { data: progress, error } = await supabase
      .from('training_progress')
      .select('*')
      .eq('realtor_id', realtor.id);

    if (error) throw error;
    return progress || [];
  }

  async updateTrainingProgress(data: {
    section: string;
    subsection: string;
    lectureCompleted: boolean;
    videoCompleted: boolean;
    practicalCompleted: boolean;
    handoverCompleted: boolean;
    examCompleted: boolean;
  }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    // Upsert training progress
    const { data: progress, error } = await supabase
      .from('training_progress')
      .upsert({
        realtor_id: realtor.id,
        section: data.section,
        subsection: data.subsection,
        lecture_completed: data.lectureCompleted,
        video_completed: data.videoCompleted,
        practical_completed: data.practicalCompleted,
        handover_completed: data.handoverCompleted,
        exam_completed: data.examCompleted,
      }, {
        onConflict: 'realtor_id,section,subsection',
      })
      .select()
      .single();

    if (error) throw error;
    return progress;
  }

  // KPI endpoints - using RPC functions
  async getTeamKPI(teamId: string) {
    const { data, error } = await supabase.rpc('get_team_kpi', {
      p_team_id: teamId,
    });

    if (error) throw error;
    return data;
  }

  async getOfficeKPI(officeId: string) {
    const { data, error } = await supabase.rpc('get_office_kpi', {
      p_office_id: officeId,
    });

    if (error) throw error;
    return data;
  }

  async getCityKPI(cityId: string) {
    const { data, error } = await supabase.rpc('get_city_kpi', {
      p_city_id: cityId,
    });

    if (error) throw error;
    return data;
  }

  async getCountryKPI(countryId: string) {
    const { data, error } = await supabase.rpc('get_country_kpi', {
      p_country_id: countryId,
    });

    if (error) throw error;
    return data;
  }

  async getRealtorKPI(realtorId: string) {
    const { data, error } = await supabase.rpc('get_realtor_kpi', {
      p_realtor_id: realtorId,
    });

    if (error) throw error;
    return data;
  }
}

export const supabaseApi = new SupabaseApiClient();

