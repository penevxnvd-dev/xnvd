// Supabase-based API client - loads data directly from Supabase
// Uses only Supabase, no local backup
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { handleSupabaseError } from './errorHandler';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

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

  // Countries - Supabase only
  async getCountries() {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('countries')
      .select('id, name, code')
      .order('name', { ascending: true });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'countries'>[]) || [];
  }

  // Cities - Supabase only
  async getCitiesByCountry(countryId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, country_id')
      .eq('country_id', countryId)
      .order('name', { ascending: true });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'cities'>[]) || [];
  }

  // Offices - Supabase only
  async getOfficesByCity(cityId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('offices')
      .select('id, name, city_id, address')
      .eq('city_id', cityId)
      .order('name', { ascending: true });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'offices'>[]) || [];
  }

  async getAllOffices() {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('offices')
      .select('id, name, city_id, address')
      .order('name', { ascending: true });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'offices'>[]) || [];
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

  // Teams - Supabase first, then local backup
  async getTeamsByOffice(officeId: string) {
    // Засега използваме директно Supabase за да избегнем проблеми с local backup
    // Local backup може да съдържа стари или неправилни данни
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    
    try {
      // Директно заявка към Supabase за актуални данни - оптимизирано с конкретни колони
      const { data, error } = await supabase
      .from('teams')
        .select('id, name, office_id, leader_id')
        .eq('office_id', officeId)
        .order('name', { ascending: true });
      
      if (error) {
        throw handleSupabaseError(error);
      }
      
      const teams = (data as Tables<'teams'>[]) || [];
      
      // Стриктна дедупликация по ID и валидация на office_id
      const seenIds = new Set<string>();
      const uniqueTeams: Tables<'teams'>[] = [];
      
      for (const team of teams) {
        // Проверка дали office_id съвпада (допълнителна защита)
        if (team.office_id !== officeId) {
          console.warn(`[getTeamsByOffice] Team ${team.id} (${team.name}) has wrong office_id: ${team.office_id} (expected ${officeId})`);
          continue;
        }
        
        // Проверка за дублиране по ID
        if (seenIds.has(team.id)) {
          console.warn(`[getTeamsByOffice] Duplicate team ID found: ${team.id} (${team.name})`);
          continue;
        }
        
        seenIds.add(team.id);
        uniqueTeams.push(team);
      }
      
      console.info(`[getTeamsByOffice] Returning ${uniqueTeams.length} unique teams for office ${officeId}:`, uniqueTeams.map(t => t.name));
      return uniqueTeams;
    } catch (error) {
      console.error('[getTeamsByOffice] Supabase failed:', error);
      throw handleSupabaseError(error as Error);
    }
  }

  // Realtors - Supabase only
  async getRealtorsByTeam(teamId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('realtors')
      .select('id, user_id, team_id, level')
      .eq('team_id', teamId)
      .order('level', { ascending: false });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'realtors'>[]) || [];
  }

  // Get all trainees and recruits (users with trainee role or realtors with level 1)
  async getAllTraineesAndRecruits() {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    try {
      // Get all users with trainee role
      const { data: traineeRoles, error: traineeRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'trainee');

      if (traineeRolesError) throw traineeRolesError;

      // Get all realtors with level 1 (new recruits)
      const { data: recruitRealtors, error: recruitRealtorsError } = await supabase
        .from('realtors')
        .select('user_id, level, team_id')
        .eq('level', 1);

      if (recruitRealtorsError) throw recruitRealtorsError;

      // Combine user IDs
      const traineeUserIds = (traineeRoles || []).map(r => r.user_id);
      const recruitUserIds = (recruitRealtors || []).map(r => r.user_id);
      const allUserIds = [...new Set([...traineeUserIds, ...recruitUserIds])];

      if (allUserIds.length === 0) {
        return [];
      }

      // Get profiles for all trainees and recruits
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .in('id', allUserIds)
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Get realtor info for recruits
      const recruitRealtorsMap = new Map(
        (recruitRealtors || []).map(r => [r.user_id, r])
      );

      // Map to return format
      return (profiles || []).map(profile => {
        const isRecruit = recruitRealtorsMap.has(profile.id);
        const realtorInfo = recruitRealtorsMap.get(profile.id);

        return {
          id: profile.id,
          name: profile.full_name || profile.email,
          email: profile.email,
          type: isRecruit ? 'recruit' : 'trainee',
          level: isRecruit ? 1 : undefined,
          teamId: realtorInfo?.team_id || null,
          createdAt: profile.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching trainees and recruits:', error);
      throw handleSupabaseError(error as Error);
    }
  }

  // Get cities managed by a regional manager
  async getUserManagedCities(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, country_id')
      .eq('manager_id', userId);
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Array<{ id: string; name: string; country_id: string }>) || [];
  }

  // Get office managed by an office manager
  async getUserManagedOffice(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('offices')
      .select('id, name, city_id, address')
      .eq('manager_id', userId)
      .limit(1)
      .single();
    
    if (error) {
      return null;
    }
    return data as { id: string; name: string; city_id: string; address?: string } | null;
  }

  // Get team led by a team leader
  async getUserTeam(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, office_id, leader_id')
      .eq('leader_id', userId)
      .limit(1)
      .single();
    
    if (error) {
      return null;
    }
    return data as { id: string; name: string; office_id: string; leader_id: string } | null;
  }

  // Get office ID for a realtor by their user_id
  async getRealtorOffice(userId: string): Promise<string | null> {
    try {
      // Get realtor by user_id
      const { data: realtor, error: realtorError } = await supabase
        .from('realtors')
        .select('team_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (realtorError || !realtor || !realtor.team_id) {
        return null;
      }

      // Get team to get office_id
      const { data: team, error: teamError } = await supabase
      .from('teams')
        .select('office_id')
        .eq('id', realtor.team_id)
        .limit(1)
      .single();

      if (teamError || !team) {
        return null;
      }

      return team.office_id;
    } catch (error) {
      console.error('Error fetching realtor office:', error);
      return null;
    }
  }

  // Get city and office for a team leader by leaderId
  async getLeaderCityAndOffice(leaderId: string) {
    try {
      // Get team by leader_id
      const { data: team, error: teamError } = await supabase
      .from('teams')
        .select('office_id')
        .eq('leader_id', leaderId)
        .limit(1)
        .single();

      if (teamError || !team) return null;

      // Get office by office_id
      const { data: office, error: officeError } = await supabase
        .from('offices')
        .select('id, name, city_id')
        .eq('id', team.office_id)
        .limit(1)
        .single();

      if (officeError || !office) return null;

      // Get city by city_id
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id, name')
        .eq('id', office.city_id)
        .limit(1)
        .single();

      if (cityError || !city) return null;

      return {
        cityId: city.id,
        cityName: city.name,
        officeId: office.id,
        officeName: office.name,
      };
    } catch (error) {
      console.error('Error getting leader city and office:', error);
      return null;
    }
  }

  async getAllTeamLeaders() {
    try {
      // Get all teams with their leaders
      const { data: teams, error: teamsError } = await supabase
      .from('teams')
        .select('leader_id')
      .not('leader_id', 'is', null);

      if (teamsError) throw teamsError;

      const leaderIds = teams
        .map(t => t.leader_id)
        .filter((id): id is string => !!id);

      if (leaderIds.length === 0) return [];

      // Get profiles for all leaders
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', leaderIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map(profile => ({
        id: profile.id,
        fullName: profile.full_name || profile.email,
        email: profile.email,
      }));
    } catch (error) {
      console.error('Error fetching team leaders:', error);
      throw handleSupabaseError(error as Error);
    }
  }

  async getAllOfficeManagers() {
    try {
      // Get all offices with their managers
      const { data: offices, error: officesError } = await supabase
        .from('offices')
        .select('manager_id')
        .not('manager_id', 'is', null);

      if (officesError) throw officesError;

      const managerIds = offices
        .map(o => o.manager_id)
        .filter((id): id is string => !!id);

      if (managerIds.length === 0) return [];

      // Get profiles for all office managers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', managerIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map(profile => ({
        id: profile.id,
        fullName: profile.full_name || profile.email,
        email: profile.email,
      }));
    } catch (error) {
      console.error('Error fetching office managers:', error);
      throw handleSupabaseError(error as Error);
    }
  }

  async getAllRegionalManagers() {
    try {
      // Get all cities with their managers
      const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('manager_id')
        .not('manager_id', 'is', null);

      if (citiesError) throw citiesError;

      const managerIds = cities
        .map(c => c.manager_id)
        .filter((id): id is string => !!id);

      if (managerIds.length === 0) return [];

      // Get profiles for all regional managers
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
        .select('id, full_name, email')
        .in('id', managerIds);

    if (profilesError) throw profilesError;

      return (profiles || []).map(profile => ({
      id: profile.id,
        fullName: profile.full_name || profile.email,
      email: profile.email,
      }));
    } catch (error) {
      console.error('Error fetching regional managers:', error);
      throw handleSupabaseError(error as Error);
    }
  }

  async getAvailableProfilesForTeam(teamId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const teamRealtors = await this.getRealtorsByTeam(teamId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      throw handleSupabaseError(error);
    }
    
    const allProfiles = (data as Tables<'profiles'>[]) || [];
    const assignedIds = new Set(teamRealtors.map(r => r.user_id));
    return allProfiles.filter(p => !assignedIds.has(p.id));
  }

  async getCurrentRealtor(userId?: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    let currentUserId = userId;
    if (!currentUserId) {
      const { user } = await this.getCurrentUser();
      if (!user) return null;
      currentUserId = user.id;
    }
    
    const { data, error } = await supabase
      .from('realtors')
      .select('*')
      .eq('user_id', currentUserId)
      .maybeSingle();
    
    if (error) {
      throw handleSupabaseError(error);
    }
    
    return data as Tables<'realtors'> | null;
  }

  // Deals - Supabase only
  async getMyDeals(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('realtor_id', realtor.id)
      .order('deal_date', { ascending: false });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'deals'>[]) || [];
  }

  // Diagnoses - Supabase only
  async getMyDiagnoses(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('realtor_id', realtor.id)
      .order('diagnosis_date', { ascending: false });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'diagnoses'>[]) || [];
  }

  // Training Progress - Supabase first, then local backup
  async getTrainingProgress(userId?: string) {
    let realtor;
    if (userId) {
      realtor = await this.getCurrentRealtor(userId);
    } else {
      const { user } = await this.getCurrentUser();
      if (!user) return [];
      realtor = await this.getCurrentRealtor(user.id);
    }
    
    // If no realtor record exists, try to find by user_id directly
    if (!realtor && userId) {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data: realtorByUserId, error: realtorError } = await supabase
        .from('realtors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!realtorError && realtorByUserId) {
        realtor = realtorByUserId;
      }
    }
    
    if (!realtor) return [];
    
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('training_progress')
      .select('*')
      .eq('realtor_id', realtor.id);
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'training_progress'>[]) || [];
  }

  // Get deals by realtor_id (for managers/leaders viewing their team members)
  async getRealtorDeals(realtorId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('realtor_id', realtorId)
      .order('deal_date', { ascending: false });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'deals'>[]) || [];
  }

  // Get diagnoses by realtor_id (for managers/leaders viewing their team members)
  async getRealtorDiagnoses(realtorId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('realtor_id', realtorId)
      .order('diagnosis_date', { ascending: false });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'diagnoses'>[]) || [];
  }

  // Get training progress by realtor_id (for managers/leaders viewing their team members)
  async getRealtorTrainingProgress(realtorId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('training_progress')
      .select('*')
      .eq('realtor_id', realtorId);
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'training_progress'>[]) || [];
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
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: goalsData, error: goalsError } = await supabase
      .from('realtor_goals')
      .select('*')
      .eq('realtor_id', realtor.id);
    
    if (goalsError) {
      throw handleSupabaseError(goalsError);
    }
    const goals = (goalsData as Tables<'realtor_goals'>[]) || [];

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
    if (realtors.length === 0) {
      return {
        realtors: 0,
        deals: 0,
        diagnoses: 0,
        successRate: 0,
        totalDealValue: 0,
        levelDistribution: {},
      };
    }

    // Get deals and diagnoses for all realtors
    const allDeals = await Promise.all(
      realtors.map(async (r) => {
        const userId = (r as { user_id?: string }).user_id;
        if (!userId) return [];
        return await this.getMyDeals(userId);
      })
    );
    const flatDeals = allDeals.flat();

    const allDiagnoses = await Promise.all(
      realtors.map(async (r) => {
        const userId = (r as { user_id?: string }).user_id;
        if (!userId) return [];
        return await this.getMyDiagnoses(userId);
      })
    );
    const flatDiagnoses = allDiagnoses.flat();

    // Calculate level distribution
    const levelDistribution: Record<number, number> = {};
    realtors.forEach((r) => {
      const level = (r as { level?: number }).level || 1;
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });

    // Calculate metrics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthDeals = flatDeals.filter(
      (deal) => new Date((deal as { deal_date?: string }).deal_date || '') >= currentMonth
    );
    const monthDiagnoses = flatDiagnoses.filter(
      (diagnosis) => new Date((diagnosis as { diagnosis_date?: string }).diagnosis_date || '') >= currentMonth
    );

    const successRate = monthDiagnoses.length > 0
      ? Math.round((monthDeals.length / monthDiagnoses.length) * 100)
      : 0;

    const totalDealValue = monthDeals.reduce((sum, deal) => {
      const dealValue = (deal as { deal_value?: string | number }).deal_value;
      return sum + (typeof dealValue === 'string' ? parseFloat(dealValue) : (dealValue || 0));
    }, 0);

    return {
      realtors: realtors.length,
      deals: monthDeals.length,
      diagnoses: monthDiagnoses.length,
      successRate,
      totalDealValue,
      levelDistribution,
    };
  }

  async getOfficeKPI(officeId: string) {
    const teams = await this.getTeamsByOffice(officeId);
    if (teams.length === 0) {
      return {
        realtors: 0,
        deals: 0,
        diagnoses: 0,
        successRate: 0,
        totalDealValue: 0,
        levelDistribution: {},
      };
    }

    const kpis = await Promise.all(teams.map(t => this.getTeamKPI(t.id)));
    
    // Aggregate all metrics
    const totalRealtors = kpis.reduce((sum, kpi) => sum + kpi.realtors, 0);
    const totalDeals = kpis.reduce((sum, kpi) => sum + kpi.deals, 0);
    const totalDiagnoses = kpis.reduce((sum, kpi) => sum + kpi.diagnoses, 0);
    const totalDealValue = kpis.reduce((sum, kpi) => sum + kpi.totalDealValue, 0);
    
    // Merge level distributions
    const levelDistribution: Record<number, number> = {};
    kpis.forEach((kpi) => {
      Object.entries(kpi.levelDistribution).forEach(([level, count]) => {
        levelDistribution[Number(level)] = (levelDistribution[Number(level)] || 0) + count;
      });
    });

    const successRate = totalDiagnoses > 0
      ? Math.round((totalDeals / totalDiagnoses) * 100)
      : 0;

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
    const offices = await this.getOfficesByCity(cityId);
    if (offices.length === 0) {
      return {
        realtors: 0,
        deals: 0,
        diagnoses: 0,
        successRate: 0,
        totalDealValue: 0,
        levelDistribution: {},
      };
    }

    const kpis = await Promise.all(offices.map(o => this.getOfficeKPI(o.id)));
    
    // Aggregate all metrics
    const totalRealtors = kpis.reduce((sum, kpi) => sum + kpi.realtors, 0);
    const totalDeals = kpis.reduce((sum, kpi) => sum + kpi.deals, 0);
    const totalDiagnoses = kpis.reduce((sum, kpi) => sum + kpi.diagnoses, 0);
    const totalDealValue = kpis.reduce((sum, kpi) => sum + kpi.totalDealValue, 0);
    
    // Merge level distributions
    const levelDistribution: Record<number, number> = {};
    kpis.forEach((kpi) => {
      Object.entries(kpi.levelDistribution).forEach(([level, count]) => {
        levelDistribution[Number(level)] = (levelDistribution[Number(level)] || 0) + count;
      });
    });

    const successRate = totalDiagnoses > 0
      ? Math.round((totalDeals / totalDiagnoses) * 100)
      : 0;

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
    const cities = await this.getCitiesByCountry(countryId);
    if (cities.length === 0) {
      return {
        realtors: 0,
        deals: 0,
        diagnoses: 0,
        successRate: 0,
        totalDealValue: 0,
        levelDistribution: {},
      };
    }

    const kpis = await Promise.all(cities.map(c => this.getCityKPI(c.id)));
    
    // Aggregate all metrics
    const totalRealtors = kpis.reduce((sum, kpi) => sum + kpi.realtors, 0);
    const totalDeals = kpis.reduce((sum, kpi) => sum + kpi.deals, 0);
    const totalDiagnoses = kpis.reduce((sum, kpi) => sum + kpi.diagnoses, 0);
    const totalDealValue = kpis.reduce((sum, kpi) => sum + kpi.totalDealValue, 0);
    
    // Merge level distributions
    const levelDistribution: Record<number, number> = {};
    kpis.forEach((kpi) => {
      Object.entries(kpi.levelDistribution).forEach(([level, count]) => {
        levelDistribution[Number(level)] = (levelDistribution[Number(level)] || 0) + count;
      });
    });

    const successRate = totalDiagnoses > 0
      ? Math.round((totalDeals / totalDiagnoses) * 100)
      : 0;

    return {
      realtors: totalRealtors,
      deals: totalDeals,
      diagnoses: totalDiagnoses,
      successRate,
      totalDealValue,
      levelDistribution,
    };
  }

  // Buyer Schedule - Supabase only
  async getBuyerSchedule(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const realtor = await this.getCurrentRealtor(userId);
    if (!realtor) return [];
    
    const { data, error } = await supabase
      .from('buyer_schedule')
      .select('*')
      .eq('realtor_id', realtor.id)
      .order('schedule_date', { ascending: true });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'buyer_schedule'>[]) || [];
  }

  // Messages - Supabase only
  async getMessages(userId: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw handleSupabaseError(error);
    }
    return (data as Tables<'messages'>[]) || [];
  }

  // Write operations always go to Supabase (can't hardcode writes)
  async createCountry(data: { name: string; code: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: country, error } = await supabase
      .from('countries')
      .insert({ name: data.name, code: data.code.toUpperCase() })
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return country;
  }

  async updateCountry(id: string, data: { name?: string; code?: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const updateData: { name?: string; code?: string } = {};
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code.toUpperCase();
    
    const { data: country, error } = await supabase
      .from('countries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return country;
  }

  async deleteCountry(id: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { error } = await supabase
      .from('countries')
      .delete()
      .eq('id', id);

    if (error) throw handleSupabaseError(error);
    return { success: true };
  }

  async createCity(data: { name: string; countryId: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: city, error } = await supabase
      .from('cities')
      .insert({ name: data.name, country_id: data.countryId })
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return city;
  }

  async updateCity(id: string, data: { name: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: city, error } = await supabase
      .from('cities')
      .update({ name: data.name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return city;
  }

  async deleteCity(id: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', id);

    if (error) throw handleSupabaseError(error);
    return { success: true };
  }

  async createOffice(data: { name: string; cityId: string; address?: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: office, error } = await supabase
      .from('offices')
      .insert({ name: data.name, city_id: data.cityId, address: data.address })
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return office;
  }

  async updateOffice(id: string, data: { name?: string; address?: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: office, error } = await supabase
      .from('offices')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return office;
  }

  async deleteOffice(id: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { error } = await supabase
      .from('offices')
      .delete()
      .eq('id', id);

    if (error) throw handleSupabaseError(error);
    return { success: true };
  }

  async createTeam(data: { name: string; officeId: string; leaderId?: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name: data.name, office_id: data.officeId, leader_id: data.leaderId })
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return team;
  }

  async updateTeam(id: string, data: { name?: string; leaderId?: string }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const updateData: { name?: string; leader_id?: string | null } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.leaderId !== undefined) updateData.leader_id = data.leaderId || null;
    
    const { data: team, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return team;
  }

  async deleteTeam(id: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw handleSupabaseError(error);
    return { success: true };
  }

  async createRealtor(data: { userId: string; teamId?: string; level?: number }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { data: realtor, error } = await supabase
      .from('realtors')
      .insert({
        user_id: data.userId,
        team_id: data.teamId,
        level: data.level || 1,
      })
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return realtor;
  }

  async updateRealtor(id: string, data: { teamId?: string; level?: number }) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const updateData: { team_id?: string | null; level?: number } = {};
    if (data.teamId !== undefined) updateData.team_id = data.teamId || null;
    if (data.level !== undefined) updateData.level = data.level;
    
    const { data: realtor, error } = await supabase
      .from('realtors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return realtor;
  }

  async deleteRealtor(id: string) {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    const { error } = await supabase
      .from('realtors')
      .delete()
      .eq('id', id);

    if (error) throw handleSupabaseError(error);
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
    // Validate required fields
    if (!data.realtorId || !data.section || !data.subsection) {
      throw new Error('Missing required fields: realtorId, section, or subsection');
    }

    // Verify realtor exists
    const { data: realtor, error: realtorError } = await supabase
      .from('realtors')
      .select('id')
      .eq('id', data.realtorId)
      .single();

    if (realtorError || !realtor) {
      throw new Error(`Realtor with id ${data.realtorId} not found`);
    }

    // First, try to get existing record to preserve values that aren't being updated
    const { data: existing, error: fetchError } = await supabase
      .from('training_progress')
      .select('*')
      .eq('realtor_id', data.realtorId)
      .eq('section', data.section)
      .eq('subsection', data.subsection)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, but other errors are not
      console.error('Error fetching existing training progress:', fetchError);
      throw fetchError;
    }

    // Build update data with only provided fields
    const updateData: Record<string, string | boolean> = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are explicitly provided
    if (data.lectureCompleted !== undefined) {
      updateData.lecture_completed = data.lectureCompleted;
    }
    if (data.videoCompleted !== undefined) {
      updateData.video_completed = data.videoCompleted;
    }
    if (data.practicalCompleted !== undefined) {
      updateData.practical_completed = data.practicalCompleted;
    }
    if (data.handoverCompleted !== undefined) {
      updateData.handover_completed = data.handoverCompleted;
    }
    if (data.examCompleted !== undefined) {
      updateData.exam_completed = data.examCompleted;
    }

    // If record exists, update it
    if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('training_progress')
      .update(updateData)
      .eq('realtor_id', data.realtorId)
      .eq('section', data.section)
      .eq('subsection', data.subsection)
      .select()
        .single();

      if (updateError) {
        console.error('Error updating training progress:', updateError);
        console.error('Update data:', JSON.stringify(updateData, null, 2));
        console.error('Realtor ID:', data.realtorId);
        console.error('Section:', data.section);
        console.error('Subsection:', data.subsection);
        throw updateError;
      }

      return updated;
    }

    // If record doesn't exist, insert it
      const insertData: Record<string, string | boolean> = {
        realtor_id: data.realtorId,
        section: data.section,
        subsection: data.subsection,
        lecture_completed: data.lectureCompleted ?? false,
        video_completed: data.videoCompleted ?? false,
        practical_completed: data.practicalCompleted ?? false,
        handover_completed: data.handoverCompleted ?? false,
        exam_completed: data.examCompleted ?? false,
      updated_at: new Date().toISOString(),
      };

    const { data: inserted, error: insertError } = await supabase
        .from('training_progress')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting training progress:', insertError);
        console.error('Insert data:', JSON.stringify(insertData, null, 2));
        console.error('Realtor ID:', data.realtorId);
        console.error('Section:', data.section);
        console.error('Subsection:', data.subsection);
        throw insertError;
      }

    return inserted;
  }

  // Promote trainee to realtor when training is completed
  async promoteTraineeToRealtor(userId: string, teamId?: string) {
    try {
      // Check if user has trainee role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'trainee');

      if (rolesError) throw rolesError;

      // If user doesn't have trainee role, they might already be a realtor
      if (!userRoles || userRoles.length === 0) {
        console.log('User is not a trainee, skipping promotion');
        return;
      }

      // Remove trainee role
      const { error: deleteTraineeError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'trainee');

      if (deleteTraineeError) throw deleteTraineeError;

      // Add realtor role
      const { error: addRealtorError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'realtor',
        });

      if (addRealtorError && !addRealtorError.message.includes('duplicate')) {
        throw addRealtorError;
      }

      // Check if realtor record exists
      const { data: existingRealtor, error: realtorCheckError } = await supabase
        .from('realtors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (realtorCheckError) throw realtorCheckError;

      // Create realtor record if it doesn't exist
      if (!existingRealtor) {
        const { error: createRealtorError } = await supabase
          .from('realtors')
          .insert({
            user_id: userId,
            team_id: teamId || null,
            level: 3, // Start as "Реализатор" level
          });

        if (createRealtorError) throw createRealtorError;
      } else if (teamId) {
        // Update team if provided
        const { error: updateTeamError } = await supabase
          .from('realtors')
          .update({ team_id: teamId })
          .eq('user_id', userId);

        if (updateTeamError) throw updateTeamError;
      }

      return { success: true };
    } catch (error) {
      console.error('Error promoting trainee to realtor:', error);
      throw error;
    }
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

  // Training Groups - CRUD operations
  async getAllTrainingGroups() {
    try {
      const { data: groups, error } = await supabase
        .from('training_groups')
        .select(`
          *,
          leader:profiles!training_groups_leader_id_fkey(id, full_name, email),
          created_by
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Get trainees for each group
      const groupsWithTrainees = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: trainees, error: traineesError } = await supabase
            .from('training_group_trainees')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: true });

          if (traineesError) {
            console.error('Error fetching trainees for group:', group.id, traineesError);
    return {
              ...group,
              trainees: [],
            };
          }

          return {
            id: group.id,
            startDate: group.start_date,
            leaderId: group.leader_id,
            leader: group.leader?.full_name || 'Неизвестен',
            currentDay: group.current_day,
            status: group.status,
            dayNotes: group.day_notes || {},
            trainees: (trainees || []).map((t) => ({
              id: t.id,
              name: t.name,
              phone: t.phone || '',
              email: t.email || '',
              position: t.position || '',
              introCompleted: t.intro_completed || false,
              trainingStage: t.training_stage,
              level: t.level || 'Чирак',
            })),
            createdBy: group.created_by || null,
          };
        })
      );

      return groupsWithTrainees;
    } catch (error) {
      console.error('Error fetching training groups:', error);
      throw handleSupabaseError(error);
    }
  }

  async getTrainingGroupById(groupId: string) {
    try {
      const { data: group, error } = await supabase
        .from('training_groups')
        .select(`
          *,
          leader:profiles!training_groups_leader_id_fkey(id, full_name, email)
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;
      if (!group) return null;

      const { data: trainees, error: traineesError } = await supabase
        .from('training_group_trainees')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (traineesError) {
        console.error('Error fetching trainees:', traineesError);
        return null;
      }

    return {
        id: group.id,
        startDate: group.start_date,
        leaderId: group.leader_id,
        leader: group.leader?.full_name || 'Неизвестен',
        dayNotes: group.day_notes || {},
        currentDay: group.current_day,
        status: group.status,
        trainees: (trainees || []).map((t) => ({
          id: t.id,
          name: t.name,
          phone: t.phone || '',
          email: t.email || '',
          position: t.position || '',
          introCompleted: t.intro_completed || false,
          trainingStage: t.training_stage,
          level: t.level || 'Чирак',
        })),
      };
    } catch (error) {
      console.error('Error fetching training group:', error);
      throw handleSupabaseError(error);
    }
  }

  async createTrainingGroup(data: {
    startDate: string;
    leaderId: string;
    currentDay?: number;
    status?: 'активна' | 'завършена' | 'предстояща';
  }) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: group, error } = await supabase
        .from('training_groups')
        .insert({
          start_date: data.startDate,
          leader_id: data.leaderId,
          current_day: data.currentDay || 1,
          status: data.status || 'активна',
          created_by: userId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return group;
    } catch (error) {
      console.error('Error creating training group:', error);
      throw handleSupabaseError(error);
    }
  }

  async updateTrainingGroup(groupId: string, data: {
    startDate?: string;
    leaderId?: string;
    currentDay?: number;
    status?: 'активна' | 'завършена' | 'предстояща';
    dayNotes?: Record<string, any>;
  }) {
    try {
      const updateData: Record<string, string | number | Record<string, any>> = {};
      if (data.startDate) updateData.start_date = data.startDate;
      if (data.leaderId) updateData.leader_id = data.leaderId;
      if (data.currentDay !== undefined) updateData.current_day = data.currentDay;
      if (data.status) updateData.status = data.status;
      if (data.dayNotes !== undefined) updateData.day_notes = data.dayNotes;

      const { data: group, error } = await supabase
        .from('training_groups')
        .update(updateData)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return group;
    } catch (error) {
      console.error('Error updating training group:', error);
      throw handleSupabaseError(error);
    }
  }

  async deleteTrainingGroup(groupId: string) {
    try {
      // Delete trainees first (CASCADE should handle this, but let's be explicit)
      await supabase
        .from('training_group_trainees')
        .delete()
        .eq('group_id', groupId);

      const { error } = await supabase
        .from('training_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting training group:', error);
      throw handleSupabaseError(error);
    }
  }

  // Training Group Trainees - CRUD operations
  async addTraineeToGroup(groupId: string, data: {
    name: string;
    phone?: string;
    email?: string;
    position?: string;
  }) {
    try {
      const { data: trainee, error } = await supabase
        .from('training_group_trainees')
        .insert({
          group_id: groupId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          position: data.position || null,
          intro_completed: false,
          training_stage: 1,
          level: 'Чирак',
        })
        .select()
        .single();

      if (error) throw error;
      return trainee;
    } catch (error) {
      console.error('Error adding trainee to group:', error);
      throw handleSupabaseError(error);
    }
  }

  async updateTrainee(traineeId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    position?: string;
    introCompleted?: boolean;
    trainingStage?: number;
    level?: string;
    groupId?: string;
  }) {
    try {
      const updateData: Record<string, string | number | boolean | null> = {};
      if (data.name) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.position !== undefined) updateData.position = data.position || null;
      if (data.introCompleted !== undefined) updateData.intro_completed = data.introCompleted;
      if (data.trainingStage !== undefined) updateData.training_stage = data.trainingStage;
      if (data.level) updateData.level = data.level;
      if (data.groupId) updateData.group_id = data.groupId;

      const { data: trainee, error } = await supabase
        .from('training_group_trainees')
        .update(updateData)
        .eq('id', traineeId)
        .select()
        .single();

      if (error) throw error;
      return trainee;
    } catch (error) {
      console.error('Error updating trainee:', error);
      throw handleSupabaseError(error);
    }
  }

  async deleteTrainee(traineeId: string) {
    try {
      const { error } = await supabase
        .from('training_group_trainees')
        .delete()
        .eq('id', traineeId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting trainee:', error);
      throw handleSupabaseError(error);
    }
  }

  async markIntroCompleted(groupId: string) {
    try {
      // Mark all trainees in the group as having completed intro
      const { error } = await supabase
        .from('training_group_trainees')
        .update({ intro_completed: true })
        .eq('group_id', groupId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking intro as completed:', error);
      throw handleSupabaseError(error);
    }
  }

  async markTraineeIntroCompleted(traineeId: string) {
    try {
      const { data: trainee, error } = await supabase
        .from('training_group_trainees')
        .update({ intro_completed: true })
        .eq('id', traineeId)
        .select()
        .single();

      if (error) throw error;
      return trainee;
    } catch (error) {
      console.error('Error marking trainee intro as completed:', error);
      throw handleSupabaseError(error);
    }
  }

  async createTraineeProfile(traineeId: string, teamId?: string) {
    try {
      // Get trainee data
      const { data: trainee, error: traineeError } = await supabase
        .from('training_group_trainees')
        .select('*')
        .eq('id', traineeId)
        .single();

      if (traineeError) throw traineeError;
      if (!trainee) throw new Error('Trainee not found');

      // Check if profile already exists by email
      let profileId: string | null = null;
      if (trainee.email) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', trainee.email)
          .single();

        if (existingProfile) {
          profileId = existingProfile.id;
        }
      }

      // Create profile if doesn't exist
      if (!profileId) {
        // Generate a temporary password
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
        
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: trainee.email || `${trainee.name.toLowerCase().replace(/\s+/g, '.')}@training.local`,
          password: tempPassword,
          options: {
            data: {
              full_name: trainee.name,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        profileId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: profileId,
            full_name: trainee.name,
            email: trainee.email || `${trainee.name.toLowerCase().replace(/\s+/g, '.')}@training.local`,
          });

        if (profileError) throw profileError;

        // Assign realtor role
        await supabase
          .from('user_roles')
          .insert({
            user_id: profileId,
            role: 'realtor',
          });
      }

      // Create or update realtor record
      const { data: existingRealtor } = await supabase
        .from('realtors')
        .select('id')
        .eq('user_id', profileId)
        .single();

      let realtorId: string;
      if (existingRealtor) {
        // Update existing realtor
        const { data: updatedRealtor, error: updateError } = await supabase
          .from('realtors')
          .update({
            team_id: teamId || null,
            level: 1,
          })
          .eq('id', existingRealtor.id)
          .select()
          .single();

        if (updateError) throw updateError;
        realtorId = updatedRealtor.id;
      } else {
        // Create new realtor
        const { data: newRealtor, error: createError } = await supabase
          .from('realtors')
          .insert({
            user_id: profileId,
            team_id: teamId || null,
            level: 1,
          })
          .select()
          .single();

        if (createError) throw createError;
        realtorId = newRealtor.id;
      }

      return { profileId, realtorId };
    } catch (error) {
      console.error('Error creating trainee profile:', error);
      throw handleSupabaseError(error);
    }
  }
}

export const supabaseApi = new SupabaseApiClient();
