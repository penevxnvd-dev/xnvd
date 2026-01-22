import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';

export const useRealtors = (teamId: string | null) => {
  return useQuery({
    queryKey: ['realtors', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const data = await supabaseApi.getRealtorsByTeam(teamId);
      
      // Fetch profiles in parallel for better performance
      const userIds = data.map((r: any) => r.user_id).filter(Boolean);
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabaseApi.supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );
      
      return data.map((realtor: any) => {
        const profile = profilesMap.get(realtor.user_id);
        return {
          id: realtor.id,
          userId: realtor.user_id,
          teamId: realtor.team_id,
          level: realtor.level,
          user: {
            fullName: profile?.full_name || 'Неизвестен',
            email: profile?.email || '',
          },
        };
      });
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
