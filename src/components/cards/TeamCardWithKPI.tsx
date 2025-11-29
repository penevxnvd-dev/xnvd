import { useState, useEffect } from 'react';
import { TeamCard } from './TeamCard';
import { api } from '@/lib/api';
import { KPIMetrics } from '@/utils/kpiCalculations';

interface TeamCardWithKPIProps {
  team: {
    id: string;
    name: string;
    leaderName?: string;
  };
  onClick?: () => void;
}

export const TeamCardWithKPI = ({ team, onClick }: TeamCardWithKPIProps) => {
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
        const kpi = await api.getTeamKPI(team.id);
        setMetrics(kpi);
      } catch (error) {
        console.error('Error fetching team KPI:', error);
      }
    };
    fetchKPI();
  }, [team.id]);

  return <TeamCard team={team} metrics={metrics} onClick={onClick} />;
};

