import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: () => supabaseApi.getCountries(),
    staleTime: 5 * 60 * 1000, // 5 minutes (countries don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
};
