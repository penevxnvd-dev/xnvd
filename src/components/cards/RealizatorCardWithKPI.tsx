import { useState, useEffect } from 'react';
import { RealizatorCard } from './RealizatorCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { Achievement } from '@/utils/achievements';

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

export const RealizatorCardWithKPI = ({ realtor, achievements = [], onClick }: RealizatorCardWithKPIProps) => {
  const [metrics, setMetrics] = useState<KPIMetrics>({
    realtors: 1,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  });

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const kpi = await supabaseApi.getRealtorKPI(realtor.id);
        setMetrics(kpi);
      } catch (error) {
        console.error('Error fetching realtor KPI:', error);
      }
    };
    fetchKPI();
  }, [realtor.id]);

  return <RealizatorCard realtor={realtor} metrics={metrics} achievements={achievements} onClick={onClick} />;
};

