import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';

export const useOffices = (cityId: string | null) => {
  return useQuery({
    queryKey: ['offices', cityId],
    queryFn: () => {
      if (!cityId) return [];
      return supabaseApi.getOfficesByCity(cityId);
    },
    enabled: !!cityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
