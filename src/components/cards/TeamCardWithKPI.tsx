import { useState, useEffect } from 'react';
import { TeamCard } from './TeamCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { Achievement } from '@/utils/achievements';

interface TeamCardWithKPIProps {
  team: {
    id: string;
    name: string;
    leaderName?: string;
  };
  achievements?: Achievement[];
  onClick?: () => void;
}

export const TeamCardWithKPI = ({ team, achievements = [], onClick }: TeamCardWithKPIProps) => {
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
        const kpi = await supabaseApi.getTeamKPI(team.id);
        setMetrics(kpi);
      } catch (error) {
        console.error('Error fetching team KPI:', error);
      }
    };
    fetchKPI();
  }, [team.id]);

  return <TeamCard team={team} metrics={metrics} achievements={achievements} onClick={onClick} />;
};

