import { useState, useEffect, memo } from 'react';
import { RealizatorCard } from './RealizatorCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { Achievement } from '@/utils/achievements';
import { useQuery } from '@tanstack/react-query';

interface RealizatorCardWithKPIProps {
  realtor: {
    id: string;
    name: string;
    email: string;
    level: number;
    confidence?: boolean;
    salesResilience?: boolean;
    successMindset?: boolean;
    avatar?: string;
  };
  achievements?: Achievement[];
  onClick?: () => void;
}

export const RealizatorCardWithKPI = memo(({ realtor, achievements = [], onClick }: RealizatorCardWithKPIProps) => {
  const { data: metrics = {
    realtors: 1,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  } } = useQuery({
    queryKey: ['realtor-kpi', realtor.id],
    queryFn: () => supabaseApi.getRealtorKPI(realtor.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return <RealizatorCard realtor={realtor} metrics={metrics} achievements={achievements} onClick={onClick} />;
});

