import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';

export const useCities = (countryId: string | null) => {
  return useQuery({
    queryKey: ['cities', countryId],
    queryFn: () => {
      if (!countryId) return [];
      return supabaseApi.getCitiesByCountry(countryId);
    },
    enabled: !!countryId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
