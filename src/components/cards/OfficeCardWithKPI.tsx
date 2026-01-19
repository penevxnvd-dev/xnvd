import { memo } from 'react';
import { OfficeCard } from './OfficeCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { Achievement } from '@/utils/achievements';
import { useQuery } from '@tanstack/react-query';

interface OfficeCardWithKPIProps {
  office: {
    id: string;
    name: string;
    address?: string | null;
  };
  achievements?: Achievement[];
  onClick?: () => void;
}

export const OfficeCardWithKPI = memo(({ office, achievements = [], onClick }: OfficeCardWithKPIProps) => {
  const { data: metrics = {
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  } } = useQuery({
    queryKey: ['office-kpi', office.id],
    queryFn: () => supabaseApi.getOfficeKPI(office.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return <OfficeCard office={office} metrics={metrics} achievements={achievements} onClick={onClick} />;
});

