// Supabase-based API client - replaces Express API calls
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { handleSupabaseError } from './errorHandler';
import { withFallback, localBackup } from './localBackup';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

class SupabaseApiClient {
  // Expose supabase client
  get supabase() {
    return supabase;
  }

  // Auth methods - using Supabase Auth
  async login(email: string, password: string) {
    const attemptLogin = async () => {
      // Ensure Supabase client is properly initialized
      if (!supabase) {
        throw new Error('Supabase client not initialized. Please check environment variables.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Handle 400 Bad Request errors (invalid credentials)
        if (error.status === 400 || error.message.includes('Invalid login credentials') || error.message.includes('invalid_grant')) {
          throw new Error('Невалиден имейл или парола. Моля проверете данните си.');
        }
        
        // Handle email not confirmed
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          throw new Error('Моля потвърдете имейла си преди да влезете.');
        }

        // Handle network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('auth.supabase.io')) {
          throw new Error('NETWORK_ERROR');
        }

        // Handle other errors
        console.error('Login error:', error);
        throw new Error(error.message || 'Грешка при влизане. Моля опитайте отново.');
      }
    
      // Get user profile
      if (data.user) {
        // Wait a bit to ensure session is set
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile after login:', profileError);
          // Don't throw - return user without profile data
          // The profile might be created by a trigger
          return {
            user: {
              ...data.user,
              full_name: data.user.user_metadata?.full_name || data.user.email,
              email: data.user.email,
            },
            session: data.session,
          };
        }

        return {
          user: {
            ...data.user,
            ...profile,
          },
          session: data.session,
        };
      }

      return { user: data.user, session: data.session };
    };

    try {
      return await attemptLogin();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      // Retry once on network errors
      if (errMessage === 'NETWORK_ERROR' || errMessage.includes('Failed to fetch') || errMessage.includes('auth.supabase.io')) {
        console.warn('⚠️ Network error, retrying login...');
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          return await attemptLogin();
        } catch (retryError: unknown) {
          const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
          if (retryMessage === 'NETWORK_ERROR') {
            throw new Error('Проблем с връзката към сървъра. Моля проверете интернет връзката си и опитайте отново.');
          }
          throw retryError;
        }
      }
      throw err;
    }
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

    // Profile should be created automatically by trigger, but verify
    if (data.user) {
      // Wait a bit for trigger to create profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // If profile doesn't exist, create it manually
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            email: email,
          });

        if (createError) throw createError;
      }

      return {
        user: {
          ...data.user,
          ...(profile || { full_name: fullName, email }),
        },
        session: data.session,
      };
    }

    return { user: data.user, session: data.session };
  }

  async getCurrentUser() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get user profile
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

  async logout() {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    // Clear all localStorage items related to auth
    localStorage.removeItem('token');
    
    // Clear Supabase auth token if exists
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const storageKey = 'sb-' + supabaseUrl.split('//')[1]?.split('.')[0] + '-auth-token';
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      // Ignore errors
    }
    
    if (error) throw error;
  }

  // Countries
  async getCountries() {
    const result = await withFallback(
      async () => {
        const { data, error } = await supabase
          .from('countries')
          .select('*')
          .order('name', { ascending: true });
        return { data, error };
      },
      'countries'
    );

    if (result.error && !result.fromCache) {
      // Check if it's a 403 error and provide better context
      if ((result.error as { code?: string; status?: number }).code === 'PGRST301' || 
          (result.error as { status?: number }).status === 403) {
        console.error('403 Forbidden when fetching countries. Check:', {
          authenticated: (await supabase.auth.getUser()).data.user !== null,
          error: result.error instanceof Error ? result.error.message : String(result.error),
        });
      }
      throw handleSupabaseError(result.error);
    }

    if (result.fromCache) {
      console.info('[getCountries] Using local backup data');
    }

    return (result.data as Tables<'countries'>[]) || [];
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
    const result = await withFallback(
      async () => {
        const { data, error } = await supabase
          .from('cities')
          .select('*')
          .eq('country_id', countryId)
          .order('name', { ascending: true });
        return { data, error };
      },
      'cities',
      (item: unknown) => {
        const city = item as { country_id?: string };
        return city.country_id === countryId;
      }
    );

    if (result.error && !result.fromCache) {
      throw handleSupabaseError(result.error);
    }

    if (result.fromCache) {
      console.info('[getCitiesByCountry] Using local backup data');
    }

    return (result.data as Tables<'cities'>[]) || [];
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
    const result = await withFallback(
      async () => {
        const { data, error } = await supabase
          .from('offices')
          .select('*')
          .order('name', { ascending: true });
        return { data, error };
      },
      'offices'
    );

    if (result.error && !result.fromCache) {
      throw handleSupabaseError(result.error);
    }

    if (result.fromCache) {
      console.info('[getAllOffices] Using local backup data');
    }

    return (result.data as Tables<'offices'>[]) || [];
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
    const teamsByOffice = (allTeams || []).reduce((acc: Record<string, Array<Record<string, unknown>>>, team: Record<string, unknown>) => {
      const officeId = team.office_id as string;
      if (!acc[officeId]) {
        acc[officeId] = [];
      }
      acc[officeId].push(team);
      return acc;
    }, {} as Record<string, Array<Record<string, unknown>>>);

    // Attach teams to offices
    return (offices || []).map((office: Record<string, unknown>) => ({
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
    (teams || []).forEach((team: { leader?: { id?: string; full_name?: string; email?: string } }) => {
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
    return (profiles || []).filter((profile: { realtors?: Array<{ team_id?: string | null }> }) => {
      const realtor = profile.realtors?.[0];
      return !realtor || !realtor.team_id;
    }).map((profile: { id: string; full_name: string; email: string }) => ({
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

    // Use the get_realtor_id function if available, otherwise query directly
    try {
      const { data: realtorId, error: functionError } = await supabase
        .rpc('get_realtor_id', { _user_id: user.id });

      if (!functionError && realtorId) {
        // Get full realtor data with profile
        const { data: realtor, error: realtorError } = await supabase
          .from('realtors')
          .select(`
            *,
            profile:profiles!realtors_user_id_fkey (
              id,
              full_name,
              email
            )
          `)
          .eq('id', realtorId)
          .single();

        if (realtorError) throw realtorError;
        return realtor;
      }
    } catch (e) {
      // Function might not exist, fall back to direct query
    }

    // Fallback: query directly
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (realtorError) {
      if (realtorError.code === 'PGRST116') {
        throw new Error('Realtor not found');
      }
      throw realtorError;
    }

    return realtor;
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

    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .eq('realtor_id', realtor.id)
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

    const { data: diagnoses, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('realtor_id', realtor.id)
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
  async getTrainingProgress(realtorId?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID - either from parameter (for team leaders/managers) or from current user
    let targetRealtorId: string;
    
    if (realtorId) {
      // Team leader or office manager viewing another realtor's progress
      targetRealtorId = realtorId;
    } else {
      // Regular realtor viewing their own progress
      const { data: realtor, error: realtorError } = await supabase
        .from('realtors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (realtorError || !realtor) {
        throw new Error('Realtor not found');
      }
      targetRealtorId = realtor.id;
    }

    const { data: progress, error } = await supabase
      .from('training_progress')
      .select('*')
      .eq('realtor_id', targetRealtorId)
      .order('section', { ascending: true })
      .order('subsection', { ascending: true });

    if (error) throw error;
    return progress || [];
  }

  async updateTrainingProgress(data: {
    section: string;
    subsection: string;
    lecture_completed?: boolean;
    video_completed?: boolean;
    practical_completed?: boolean;
    handover_completed?: boolean;
    exam_completed?: boolean;
    realtorId?: string; // Optional: for team leaders/office managers to update other realtors
  }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get realtor ID - either from parameter (for team leaders/managers) or from current user
    let realtorId: string;
    
    if (data.realtorId) {
      // Team leader or office manager updating another realtor's progress
      realtorId = data.realtorId;
    } else {
      // Regular realtor updating their own progress
      const { data: realtor, error: realtorError } = await supabase
        .from('realtors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (realtorError || !realtor) {
        throw new Error('Realtor not found');
      }
      realtorId = realtor.id;
    }

    // Get current progress first
    const { data: existingProgress } = await supabase
      .from('training_progress')
      .select('*')
      .eq('realtor_id', realtor.id)
      .eq('section', data.section)
      .eq('subsection', data.subsection)
      .maybeSingle();

    // Merge with existing progress
    const progressData = {
      realtor_id: realtorId,
      section: data.section,
      subsection: data.subsection,
      lecture_completed: data.lecture_completed ?? existingProgress?.lecture_completed ?? false,
      video_completed: data.video_completed ?? existingProgress?.video_completed ?? false,
      practical_completed: data.practical_completed ?? existingProgress?.practical_completed ?? false,
      handover_completed: data.handover_completed ?? existingProgress?.handover_completed ?? false,
      exam_completed: data.exam_completed ?? existingProgress?.exam_completed ?? false,
    };

    // Upsert training progress
    const { data: progress, error } = await supabase
      .from('training_progress')
      .upsert(progressData, {
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

      const level = (realtor as { level?: number }).level || 1;
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

  // Profile methods
  async updateProfile(fullName: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { user: data };
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { success: true };
  }

  // Goals
  async getMyGoals(month?: number, year?: number) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      return null;
    }

    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('realtor_goals')
      .select('*')
      .eq('realtor_id', realtor.id)
      .eq('month', targetMonth)
      .eq('year', targetYear)
      .maybeSingle();

    if (error) throw error;
    return data ? {
      dealsGoal: data.deals_goal,
      keysGoal: data.keys_goal,
      exclusivesGoal: data.exclusives_goal,
      ...data
    } : null;
  }

  async setMyGoals(month: number, year: number, dealsGoal: number, keysGoal: number, exclusivesGoal: number) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('realtor_goals')
      .upsert({
        realtor_id: realtor.id,
        month,
        year,
        deals_goal: dealsGoal,
        keys_goal: keysGoal,
        exclusives_goal: exclusivesGoal,
      }, {
        onConflict: 'realtor_id,month,year',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Schedule
  async getMySchedule(date?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('buyer_schedule')
      .select('*')
      .eq('realtor_id', realtor.id)
      .order('schedule_date', { ascending: true });

    if (error) throw error;
    return (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      scheduleDate: item.schedule_date,
      timeSlot: item.time_slot,
      buyer1Name: item.buyer1_name,
      buyer1Phone: item.buyer1_phone,
      buyer1Notes: item.buyer1_notes,
      buyer2Name: item.buyer2_name,
      buyer2Phone: item.buyer2_phone,
      buyer2Notes: item.buyer2_notes,
    }));
  }

  async createScheduleEntry(entryData: {
    scheduleDate: string;
    timeSlot: string;
    buyer1Name?: string;
    buyer1Phone?: string;
    buyer1Notes?: string;
    buyer2Name?: string;
    buyer2Phone?: string;
    buyer2Notes?: string;
    id?: string;
  }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (realtorError || !realtor) {
      throw new Error('Realtor not found');
    }

    const insertData = {
      realtor_id: realtor.id,
      schedule_date: entryData.scheduleDate,
      time_slot: entryData.timeSlot,
      buyer1_name: entryData.buyer1Name || null,
      buyer1_phone: entryData.buyer1Phone || null,
      buyer1_notes: entryData.buyer1Notes || null,
      buyer2_name: entryData.buyer2Name || null,
      buyer2_phone: entryData.buyer2Phone || null,
      buyer2_notes: entryData.buyer2Notes || null,
    };

    if (entryData.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('buyer_schedule')
        .update(insertData)
        .eq('id', entryData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('buyer_schedule')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteScheduleEntry(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('buyer_schedule')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // Messages
  async getConversation(userId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((msg: Record<string, unknown>) => ({
      ...msg,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      createdAt: msg.created_at,
    }));
  }

  async sendMessage(receiverId: string, content: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      createdAt: data.created_at,
    };
  }

  async markMessagesAsRead(userId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('messages')
      .update({ read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id);

    if (error) throw error;
    return { success: true };
  }
}

export const supabaseApi = new SupabaseApiClient();

