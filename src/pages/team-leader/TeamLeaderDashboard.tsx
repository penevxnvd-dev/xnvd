import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Home, Users, TrendingUp, Target, CheckCircle2, Download, BarChart3 } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { exportKPIData } from '@/lib/export';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import { calculateTeamKPI, RealtorData, KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamLeaderDashboardProps {
  userId: string;
}

interface TeamData {
  id: string;
  name: string;
  office_id: string;
  leader_id: string | null;
  realtors: Array<{
    id: string;
    userId: string;
    teamId: string | null;
    level: number;
    user: {
      fullName: string;
      email: string;
    };
    deals: Array<{
      id: string;
      dealValue: string;
      dealDate: string;
    }>;
    diagnoses: Array<{
      id: string;
      diagnosisDate: string;
    }>;
  }>;
}

const TeamLeaderDashboard = ({ userId }: TeamLeaderDashboardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [userInfo, setUserInfo] = useState({ fullName: '', email: '', role: 'Ръководител на екип' });

  useEffect(() => {
    fetchTeamData();
    fetchUserInfo();
  }, [userId, fetchTeamData]);

  const fetchUserInfo = async () => {
    try {
      const { user } = await api.getCurrentUser();
      if (user) {
        setUserInfo({
          fullName: user.full_name || user.email,
          email: user.email,
          role: 'Ръководител на екип'
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchTeamData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Find team where user is leader
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          office_id,
          leader_id,
          realtors (
            id,
            user_id,
            team_id,
            level,
            user:profiles!realtors_user_id_fkey (
              full_name,
              email
            ),
            deals (
              id,
              deal_value,
              deal_date
            ),
            diagnoses (
              id,
              diagnosis_date
            )
          )
        `)
        .eq('leader_id', userId)
        .single();

      if (teamError) throw teamError;

      // Transform data
      const transformedTeam: TeamData = {
        id: team.id,
        name: team.name,
        office_id: team.office_id,
        leader_id: team.leader_id,
        realtors: ((team.realtors as Record<string, unknown>[]) || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          userId: r.user_id as string,
          teamId: r.team_id as string,
          level: r.level as number,
          user: {
            fullName: ((r.user as Record<string, unknown>)?.full_name as string) || '',
            email: ((r.user as Record<string, unknown>)?.email as string) || '',
          },
          deals: (r.deals as unknown[]) || [],
          diagnoses: (r.diagnoses as unknown[]) || [],
        })),
      };

      setTeamData(transformedTeam);

      // Calculate KPI
      const realtorData: RealtorData[] = transformedTeam.realtors.map(r => ({
        id: r.id,
        deals: r.deals.map((d: Record<string, unknown>) => ({
          value: parseFloat(String(d.dealValue)),
          date: d.dealDate as string,
        })),
        diagnoses: r.diagnoses.map((d: Record<string, unknown>) => ({
          date: d.diagnosisDate as string,
        })),
      }));

      const kpi = calculateTeamKPI(realtorData);
      setKpiMetrics(kpi);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching team data:', error);
      toast.error(message || 'Грешка при зареждане на данни');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Няма намерен екип</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Не сте назначени като ръководител на екип.
            </p>
            <Button onClick={handleLogout} className="mt-4 w-full" variant="outline">
              Изход
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold">Екип: {teamData.name}</h1>
              <p className="text-sm text-muted-foreground">{userInfo.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Експорт
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Експорт на данни</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  if (kpiMetrics) {
                    exportKPIData(kpiMetrics, `kpi-team-${teamData.name}-${new Date().toISOString().split('T')[0]}`);
                    toast.success('KPI данните са експортирани');
                  }
                }}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  KPI данни
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NotificationCenter />
            <ThemeToggle />
            <AccountSettingsDialog />
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Изход
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Диагнози
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics?.diagnoses || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Сделки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics?.deals || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Успеваемост
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatSuccessRate(kpiMetrics?.successRate || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Realtors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Реализатори в екипа
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamData.realtors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Няма реализатори в този екип
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamData.realtors.map((realtor) => (
                  <RealizatorCardWithKPI
                    key={realtor.id}
                    realtor={{
                      id: realtor.id,
                      userId: realtor.userId,
                      teamId: realtor.teamId,
                      level: realtor.level,
                      user: realtor.user,
                      deals: realtor.deals.map(d => ({
                        id: d.id,
                        dealValue: d.dealValue,
                        dealDate: d.dealDate,
                      })),
                      diagnoses: realtor.diagnoses.map(d => ({
                        id: d.id,
                        diagnosisDate: d.diagnosisDate,
                      })),
                    }}
                    onSelect={() => {}}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;

