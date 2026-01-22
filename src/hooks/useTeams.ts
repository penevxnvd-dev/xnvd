import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';
import { formatNameWithoutElevenEleven } from '@/utils/nameEmojis';

export const useTeams = (officeId: string | null) => {
  return useQuery({
    queryKey: ['teams', officeId],
    queryFn: async () => {
      if (!officeId) return [];
      const data = await supabaseApi.getTeamsByOffice(officeId);
      
      // Map and deduplicate teams
      const seenIds = new Set<string>();
      return data
        .filter((team: any) => {
          if (seenIds.has(team.id)) {
            console.warn(`[useTeams] Duplicate team ID: ${team.id} (${team.name})`);
            return false;
          }
          seenIds.add(team.id);
          return team.office_id === officeId; // Additional validation
        })
        .map((team: any) => ({
          id: team.id,
          name: team.name,
          office_id: team.office_id || officeId,
          leader_id: team.leader_id || null,
        }));
    },
    enabled: !!officeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
