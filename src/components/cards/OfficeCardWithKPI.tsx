import { useState, useEffect } from 'react';
import { OfficeCard } from './OfficeCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { Achievement } from '@/utils/achievements';

interface OfficeCardWithKPIProps {
  office: {
    id: string;
    name: string;
    address?: string | null;
  };
  achievements?: Achievement[];
  onClick?: () => void;
}

export const OfficeCardWithKPI = ({ office, achievements = [], onClick }: OfficeCardWithKPIProps) => {
  const [metrics, setMetrics] = useState<KPIMetrics>({
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  });

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const kpi = await supabaseApi.getOfficeKPI(office.id);
        setMetrics(kpi);
      } catch (error) {
        console.error('Error fetching office KPI:', error);
      }
    };
    fetchKPI();
  }, [office.id]);

  return <OfficeCard office={office} metrics={metrics} achievements={achievements} onClick={onClick} />;
};

