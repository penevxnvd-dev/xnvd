import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Building2, Users, User } from 'lucide-react';
import { supabaseApi } from '@/lib/supabaseApi';
import { KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { cn } from '@/lib/utils';

interface AchievementItem {
  id: string;
  name: string;
  successRate: number;
  deals: number;
  diagnoses: number;
  metrics: KPIMetrics;
}

interface AchievementsScaleProps {
  type: 'offices' | 'teams' | 'realtors';
  limit?: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800';
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-800';
    case 3:
      return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800';
    default:
      return 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800';
  }
};

export const AchievementsScale = ({ type, limit = 5 }: AchievementsScaleProps) => {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let allItems: AchievementItem[] = [];

        if (type === 'offices') {
          const offices = await supabaseApi.getAllOffices();
          const itemsWithKPI = await Promise.all(
            offices.map(async (office: any) => {
              try {
                const kpi = await supabaseApi.getOfficeKPI(office.id);
                return {
                  id: office.id,
                  name: office.name,
                  successRate: kpi.successRate,
                  deals: kpi.deals,
                  diagnoses: kpi.diagnoses,
                  metrics: kpi,
                };
              } catch (error) {
                console.error(`Error fetching KPI for office ${office.id}:`, error);
                return null;
              }
            })
          );
          allItems = itemsWithKPI.filter((item): item is AchievementItem => item !== null);
        } else if (type === 'teams') {
          const offices = await supabaseApi.getAllOffices();
          const allTeams: any[] = [];
          
          for (const office of offices) {
            try {
              const teams = await supabaseApi.getTeamsByOffice(office.id);
              allTeams.push(...teams);
            } catch (error) {
              console.error(`Error fetching teams for office ${office.id}:`, error);
            }
          }

          const itemsWithKPI = await Promise.all(
            allTeams.map(async (team: any) => {
              try {
                const kpi = await supabaseApi.getTeamKPI(team.id);
                return {
                  id: team.id,
                  name: team.name,
                  successRate: kpi.successRate,
                  deals: kpi.deals,
                  diagnoses: kpi.diagnoses,
                  metrics: kpi,
                };
              } catch (error) {
                console.error(`Error fetching KPI for team ${team.id}:`, error);
                return null;
              }
            })
          );
          allItems = itemsWithKPI.filter((item): item is AchievementItem => item !== null);
        } else if (type === 'realtors') {
          const offices = await supabaseApi.getAllOffices();
          const allRealtors: any[] = [];
          
          for (const office of offices) {
            try {
              const teams = await supabaseApi.getTeamsByOffice(office.id);
              for (const team of teams) {
                try {
                  const realtors = await supabaseApi.getRealtorsByTeam(team.id);
                  allRealtors.push(...realtors);
                } catch (error) {
                  console.error(`Error fetching realtors for team ${team.id}:`, error);
                }
              }
            } catch (error) {
              console.error(`Error fetching teams for office ${office.id}:`, error);
            }
          }

          const itemsWithKPI = await Promise.all(
            allRealtors.map(async (realtor: any) => {
              try {
                const kpi = await supabaseApi.getRealtorKPI(realtor.id);
                return {
                  id: realtor.id,
                  name: realtor.profile?.full_name || 'Неизвестен',
                  successRate: kpi.successRate,
                  deals: kpi.deals,
                  diagnoses: kpi.diagnoses,
                  metrics: kpi,
                };
              } catch (error) {
                console.error(`Error fetching KPI for realtor ${realtor.id}:`, error);
                return null;
              }
            })
          );
          allItems = itemsWithKPI.filter((item): item is AchievementItem => item !== null);
        }

        // Sort by success rate (descending), then by deals, then by diagnoses
        allItems.sort((a, b) => {
          if (b.successRate !== a.successRate) {
            return b.successRate - a.successRate;
          }
          if (b.deals !== a.deals) {
            return b.deals - a.deals;
          }
          return b.diagnoses - a.diagnoses;
        });

        setItems(allItems.slice(0, limit));
      } catch (error) {
        console.error(`Error fetching ${type} data:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, limit]);

  const getTypeLabel = () => {
    switch (type) {
      case 'offices':
        return 'Офиси';
      case 'teams':
        return 'Екипи';
      case 'realtors':
        return 'Реализатори';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'offices':
        return <Building2 className="h-5 w-5" />;
      case 'teams':
        return <Users className="h-5 w-5" />;
      case 'realtors':
        return <User className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTypeIcon()}
            <span>Скала с постижения - {getTypeLabel()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Зареждане...</div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTypeIcon()}
            <span>Скала с постижения - {getTypeLabel()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Няма данни за показване</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTypeIcon()}
          <span>Скала с постижения - {getTypeLabel()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => {
          const rank = index + 1;
          const { displayName } = formatNameWithoutElevenEleven(item.name);
          
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all",
                getRankColor(rank)
              )}
            >
              <div className="flex-shrink-0">
                {getRankIcon(rank)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm sm:text-base truncate">{displayName}</h4>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Сделки: <strong className="text-foreground">{item.deals}</strong></span>
                  <span>Диагнози: <strong className="text-foreground">{item.diagnoses}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatSuccessRate(item.successRate)}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

