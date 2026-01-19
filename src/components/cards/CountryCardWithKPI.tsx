import { memo } from 'react';
import { CountryCard } from './CountryCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { useQuery } from '@tanstack/react-query';

interface CountryCardWithKPIProps {
  country: {
    id: string;
    name: string;
    code: string;
  };
  onClick?: () => void;
}

export const CountryCardWithKPI = memo(({ country, onClick }: CountryCardWithKPIProps) => {
  const { data: metrics = {
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  } } = useQuery({
    queryKey: ['country-kpi', country.id],
    queryFn: () => supabaseApi.getCountryKPI(country.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return <CountryCard country={country} metrics={metrics} onClick={onClick} />;
});

