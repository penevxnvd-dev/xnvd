// Supabase-based API client - replaces Express API calls
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

class SupabaseApiClient {
  // Expose supabase client
  get supabase() {
    return supabase;
  }

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

  async getAllOffices() {
    const { data, error } = await supabase
      .from('offices')
      .select('*')
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
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey (
          id,
          full_name,
          email
        )
      `)
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

  // Get all team leaders
  async getAllTeamLeaders() {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        leader_id,
        leader:profiles!teams_leader_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .not('leader_id', 'is', null);

    if (error) {
      console.error('Error fetching team leaders:', error);
      throw error;
    }

    // Extract unique leaders
    const leadersMap = new Map<string, { id: string; fullName: string; email: string }>();
    (teams || []).forEach((team: any) => {
      if (team.leader && team.leader.id) {
        leadersMap.set(team.leader.id, {
          id: team.leader.id,
          fullName: team.leader.full_name || 'Неизвестен',
          email: team.leader.email || '',
        });
      }
    });

    const leaders = Array.from(leadersMap.values()).sort((a, b) => 
      a.fullName.localeCompare(b.fullName)
    );

    console.log('Fetched team leaders:', leaders);
    return leaders;
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

  // Get all profiles that can be added to a team (not realtors or realtors without team)
  async getAvailableProfilesForTeam() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        realtors (id, team_id)
      `)
      .order('full_name', { ascending: true });

    if (profilesError) throw profilesError;

    // Filter to get profiles that are not realtors or realtors without a team
    return (profiles || []).filter((profile: any) => {
      const realtor = profile.realtors?.[0];
      return !realtor || !realtor.team_id;
    }).map((profile: any) => ({
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      isRealtor: !!profile.realtors?.[0],
      realtorId: profile.realtors?.[0]?.id || null,
    }));
  }

  // Add person to team (create realtor if needed, or update existing realtor)
  async addPersonToTeam(userId: string, teamId: string, level: number = 1) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Check if realtor already exists
    const { data: existingRealtor, error: checkError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingRealtor) {
      // Update existing realtor
      const { data: updatedRealtor, error: updateError } = await supabase
        .from('realtors')
        .update({ team_id: teamId, level })
        .eq('id', existingRealtor.id)
        .select(`
          *,
          profile:profiles!realtors_user_id_fkey (
            full_name,
            email
          )
        `)
        .single();

      if (updateError) throw updateError;
      return updatedRealtor;
    } else {
      // Create new realtor
      const { data: newRealtor, error: createError } = await supabase
        .from('realtors')
        .insert({
          user_id: userId,
          team_id: teamId,
          level,
        })
        .select(`
          *,
          profile:profiles!realtors_user_id_fkey (
            full_name,
            email
          )
        `)
        .single();

      if (createError) throw createError;
      return newRealtor;
    }
  }

  // Create account and add to team
  async createAccountAndAddToTeam(
    fullName: string,
    email: string,
    password: string,
    teamId: string,
    level: number = 1
  ): Promise<string> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Check if user with this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      throw new Error('Потребител с този имейл вече съществува');
    }

    // Create user in Supabase Auth (requires admin client, but we'll use signUp)
    // Note: This might require server-side implementation for admin user creation
    // For now, we'll use the regular signUp which requires email confirmation
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      throw new Error(`Грешка при създаване на акаунт: ${signUpError.message}`);
    }

    if (!authData.user) {
      throw new Error('Неуспешно създаване на акаунт');
    }

    // Wait a bit for the profile trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      // If profile wasn't created by trigger, create it manually
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
        });

      if (createProfileError) {
        throw new Error(`Грешка при създаване на профил: ${createProfileError.message}`);
      }
    }

    // Create realtor entry
    const { data: newRealtor, error: realtorError } = await supabase
      .from('realtors')
      .insert({
        user_id: authData.user.id,
        team_id: teamId,
        level,
      })
      .select('id')
      .single();

    if (realtorError) {
      throw new Error(`Грешка при добавяне към екип: ${realtorError.message}`);
    }

    return authData.user.id;
  }

  // Remove person from team
  async removePersonFromTeam(realtorId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('realtors')
      .update({ team_id: null })
      .eq('id', realtorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCurrentRealtor() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Try with foreign key relation first
    let { data: realtor, error } = await supabase
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

    // If that fails (406 error), try without the relation
    if (error && (error.code === 'PGRST116' || error.message?.includes('406'))) {
      const { data: realtorData, error: realtorError } = await supabase
        .from('realtors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (realtorError) throw realtorError;
      
      // Fetch profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      return {
        ...realtorData,
        salesResilience: realtorData.sales_resilience || false,
        successMindset: realtorData.success_mindset || false,
        user: {
          fullName: profile?.full_name || '',
          email: profile?.email || '',
        },
      };
    }

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

  // KPI endpoints - direct calculation (RPC functions removed for simplicity)
  async getRealtorKPI(realtorId: string) {
    return this.calculateRealtorKPIDirectly(realtorId);
  }

  private async calculateRealtorKPIDirectly(realtorId: string) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('deal_value, deal_date')
      .eq('realtor_id', realtorId)
      .gte('deal_date', currentMonth.toISOString().split('T')[0]);

    const { data: diagnoses, error: diagnosesError } = await supabase
      .from('diagnoses')
      .select('diagnosis_date')
      .eq('realtor_id', realtorId)
      .gte('diagnosis_date', currentMonth.toISOString().split('T')[0]);

    if (dealsError || diagnosesError) {
      throw dealsError || diagnosesError;
    }

    const dealsCount = deals?.length || 0;
    const diagnosesCount = diagnoses?.length || 0;
    const totalDealValue = deals?.reduce((sum, deal) => sum + Number(deal.deal_value), 0) || 0;
    const successRate = diagnosesCount > 0 ? Math.round((dealsCount / diagnosesCount) * 100) : 0;

    return {
      realtors: 1,
      deals: dealsCount,
      diagnoses: diagnosesCount,
      successRate,
      totalDealValue,
      levelDistribution: {},
    };
  }

  async getTeamKPI(teamId: string) {
    return this.calculateTeamKPIDirectly(teamId);
  }

  private async calculateTeamKPIDirectly(teamId: string) {
    const realtors = await this.getRealtorsByTeam(teamId);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    let totalDeals = 0;
    let totalDiagnoses = 0;
    let totalDealValue = 0;
    const levelDistribution: Record<number, number> = {};

    for (const realtor of realtors) {
      const { data: deals } = await supabase
        .from('deals')
        .select('deal_value, deal_date')
        .eq('realtor_id', realtor.id)
        .gte('deal_date', currentMonth.toISOString().split('T')[0]);

      const { data: diagnoses } = await supabase
        .from('diagnoses')
        .select('diagnosis_date')
        .eq('realtor_id', realtor.id)
        .gte('diagnosis_date', currentMonth.toISOString().split('T')[0]);

      totalDeals += deals?.length || 0;
      totalDiagnoses += diagnoses?.length || 0;
      totalDealValue += deals?.reduce((sum, deal) => sum + Number(deal.deal_value), 0) || 0;

      const level = (realtor as any).level || 1;
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    }

    const successRate = totalDiagnoses > 0 ? Math.round((totalDeals / totalDiagnoses) * 100) : 0;

    return {
      realtors: realtors.length,
      deals: totalDeals,
      diagnoses: totalDiagnoses,
      successRate,
      totalDealValue,
      levelDistribution,
    };
  }

  async getOfficeKPI(officeId: string) {
    return this.calculateOfficeKPIDirectly(officeId);
  }

  private async calculateOfficeKPIDirectly(officeId: string) {
    const teams = await this.getTeamsByOffice(officeId);
    let totalRealtors = 0;
    let totalDeals = 0;
    let totalDiagnoses = 0;
    let totalDealValue = 0;
    const levelDistribution: Record<number, number> = {};
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    for (const team of teams) {
      const teamKPI = await this.calculateTeamKPIDirectly(team.id);
      totalRealtors += teamKPI.realtors;
      totalDeals += teamKPI.deals;
      totalDiagnoses += teamKPI.diagnoses;
      totalDealValue += teamKPI.totalDealValue;
      Object.keys(teamKPI.levelDistribution).forEach(level => {
        levelDistribution[Number(level)] = (levelDistribution[Number(level)] || 0) + teamKPI.levelDistribution[Number(level)];
      });
    }

    const successRate = totalDiagnoses > 0 ? Math.round((totalDeals / totalDiagnoses) * 100) : 0;

    return {
      realtors: totalRealtors,
      deals: totalDeals,
      diagnoses: totalDiagnoses,
      successRate,
      totalDealValue,
      levelDistribution,
    };
  }

  async getCityKPI(cityId: string) {
    return this.calculateCityKPIDirectly(cityId);
  }

  private async calculateCityKPIDirectly(cityId: string) {
    const offices = await this.getOfficesByCity(cityId);
    let totalRealtors = 0;
    let totalDeals = 0;
    let totalDiagnoses = 0;
    let totalDealValue = 0;
    const levelDistribution: Record<number, number> = {};

    for (const office of offices) {
      const officeKPI = await this.calculateOfficeKPIDirectly(office.id);
      totalRealtors += officeKPI.realtors;
      totalDeals += officeKPI.deals;
      totalDiagnoses += officeKPI.diagnoses;
      totalDealValue += officeKPI.totalDealValue;
      Object.keys(officeKPI.levelDistribution).forEach(level => {
        levelDistribution[Number(level)] = (levelDistribution[Number(level)] || 0) + officeKPI.levelDistribution[Number(level)];
      });
    }

    const successRate = totalDiagnoses > 0 ? Math.round((totalDeals / totalDiagnoses) * 100) : 0;

    return {
      realtors: totalRealtors,
      deals: totalDeals,
      diagnoses: totalDiagnoses,
      successRate,
      totalDealValue,
      levelDistribution,
    };
  }

  async getCountryKPI(countryId: string) {
    return this.calculateCountryKPIDirectly(countryId);
  }

  private async calculateCountryKPIDirectly(countryId: string) {
    const cities = await this.getCitiesByCountry(countryId);
    let totalRealtors = 0;
    let totalDeals = 0;
    let totalDiagnoses = 0;
    let totalDealValue = 0;
    const levelDistribution: Record<number, number> = {};

    for (const city of cities) {
      const cityKPI = await this.calculateCityKPIDirectly(city.id);
      totalRealtors += cityKPI.realtors;
      totalDeals += cityKPI.deals;
      totalDiagnoses += cityKPI.diagnoses;
      totalDealValue += cityKPI.totalDealValue;
      Object.keys(cityKPI.levelDistribution).forEach(level => {
        levelDistribution[Number(level)] = (levelDistribution[Number(level)] || 0) + cityKPI.levelDistribution[Number(level)];
      });
    }

    const successRate = totalDiagnoses > 0 ? Math.round((totalDeals / totalDiagnoses) * 100) : 0;

    return {
      realtors: totalRealtors,
      deals: totalDeals,
      diagnoses: totalDiagnoses,
      successRate,
      totalDealValue,
      levelDistribution,
    };
  }
}

export const supabaseApi = new SupabaseApiClient();

