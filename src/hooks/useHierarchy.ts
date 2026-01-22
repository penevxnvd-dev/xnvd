import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';
import { supabase } from '@/integrations/supabase/client';

export interface CityNode {
  id: string;
  name: string;
  offices: OfficeNode[];
}

export interface OfficeNode {
  id: string;
  name: string;
  teams: TeamNode[];
}

export interface TeamNode {
  id: string;
  name: string;
}

interface HierarchyData {
  citiesTree: CityNode[];
  officesTree: OfficeNode[];
}

export const useHierarchy = (userId: string | null, role: string | null) => {
  return useQuery({
    queryKey: ['hierarchy', userId, role],
    queryFn: async (): Promise<HierarchyData> => {
      if (!userId || !role) {
        return { citiesTree: [], officesTree: [] };
      }

      // Optimized: Single query with joins for all offices, cities, and teams
      // Use left join for cities (some offices might not have cities) and teams (offices might not have teams)
      const { data: officesData, error: officesError } = await supabase
        .from('offices')
        .select(`
          id,
          name,
          city_id,
          manager_id,
          cities(
            id,
            name,
            country_id,
            manager_id
          ),
          teams(
            id,
            name,
            leader_id,
            office_id
          )
        `)
        .order('name');

      if (officesError) {
        console.error('Error fetching offices:', officesError);
        throw officesError;
      }

      if (!officesData || officesData.length === 0) {
        return { citiesTree: [], officesTree: [] };
      }

      // Filter offices based on role
      let filteredOffices = officesData;

      if (role === 'regional_manager') {
        // Get cities where user is manager
        const { data: managedCities } = await supabase
          .from('cities')
          .select('id')
          .eq('manager_id', userId);

        const cityIds = new Set(managedCities?.map((c: any) => c.id) || []);
        filteredOffices = filteredOffices.filter(
          (o: any) => o.cities?.id && cityIds.has(o.cities.id)
        );
      } else if (role === 'office_manager') {
        // Filter to only managed offices
        filteredOffices = filteredOffices.filter(
          (o: any) => o.manager_id === userId
        );
      } else if (role === 'team_leader') {
        // Get teams where user is leader
        const { data: teams } = await supabase
          .from('teams')
          .select('id, office_id')
          .eq('leader_id', userId);

        const officeIds = new Set(teams?.map((t: any) => t.office_id).filter(Boolean) || []);
        const teamIds = new Set(teams?.map((t: any) => t.id) || []);

        filteredOffices = filteredOffices
          .filter((o: any) => officeIds.has(o.id))
          .map((o: any) => ({
            ...o,
            teams: (o.teams || []).filter((t: any) => teamIds.has(t.id)),
          }))
          .filter((o: any) => (o.teams || []).length > 0);
      } else if (role === 'realtor') {
        // Get realtor's team
        const realtor = await supabaseApi.getCurrentRealtor(userId);
        const teamId = realtor?.team_id;

        if (teamId) {
          filteredOffices = filteredOffices
            .map((o: any) => ({
              ...o,
              teams: (o.teams || []).filter((t: any) => t.id === teamId),
            }))
            .filter((o: any) => (o.teams || []).length > 0);
        } else {
          filteredOffices = [];
        }
      }
      // For admin, use all offices

      // Build tree structure based on role
      if (role === 'regional_manager' || role === 'admin') {
        // Build City -> Office -> Team tree
        const cityMap = new Map<string, CityNode>();

        filteredOffices.forEach((office: any) => {
          const cityId = office.cities?.id;
          const cityName = office.cities?.name || 'Unknown city';

          if (!cityId) return;

          if (!cityMap.has(cityId)) {
            cityMap.set(cityId, {
              id: cityId,
              name: cityName,
              offices: [],
            });
          }

          const city = cityMap.get(cityId)!;
          const teams: TeamNode[] = (office.teams || [])
            .filter((t: any) => t.office_id === office.id) // Ensure team belongs to office
            .map((t: any) => ({
              id: t.id,
              name: t.name,
            }));

          city.offices.push({
            id: office.id,
            name: office.name,
            teams,
          });
        });

        return {
          citiesTree: Array.from(cityMap.values()),
          officesTree: [],
        };
      } else {
        // Build Office -> Team tree (no city level)
        const officesTree: OfficeNode[] = filteredOffices.map((office: any) => ({
          id: office.id,
          name: office.name,
          teams: (office.teams || [])
            .filter((t: any) => t.office_id === office.id) // Ensure team belongs to office
            .map((t: any) => ({
              id: t.id,
              name: t.name,
            })),
        }));

        return {
          citiesTree: [],
          officesTree: officesTree,
        };
      }
    },
    enabled: !!userId && !!role,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
