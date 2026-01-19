import { memo } from 'react';
import { TeamCard } from './TeamCard';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics } from '@/utils/kpiCalculations';
import { Achievement } from '@/utils/achievements';
import { useQuery } from '@tanstack/react-query';

interface TeamCardWithKPIProps {
  team: {
    id: string;
    name: string;
    leaderName?: string;
  };
  achievements?: Achievement[];
  onClick?: () => void;
}

export const TeamCardWithKPI = memo(({ team, achievements = [], onClick }: TeamCardWithKPIProps) => {
  const { data: metrics = {
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  } } = useQuery({
    queryKey: ['team-kpi', team.id],
    queryFn: () => supabaseApi.getTeamKPI(team.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return <TeamCard team={team} metrics={metrics} achievements={achievements} onClick={onClick} />;
});

