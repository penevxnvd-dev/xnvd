import { memo } from 'react';
import { CityCard } from './CityCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { useQuery } from '@tanstack/react-query';

interface CityCardWithKPIProps {
  city: {
    id: string;
    name: string;
    countryName?: string;
  };
  onClick?: () => void;
}

export const CityCardWithKPI = memo(({ city, onClick }: CityCardWithKPIProps) => {
  const { data: metrics = {
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  } } = useQuery({
    queryKey: ['city-kpi', city.id],
    queryFn: () => supabaseApi.getCityKPI(city.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return <CityCard city={city} metrics={metrics} onClick={onClick} />;
});

