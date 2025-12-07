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
import { LogOut, Building2, Users, TrendingUp, Download, BarChart3, Settings } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { NotificationCenter } from '@/components/NotificationCenter';
import { exportKPIData } from '@/lib/export';
import { TeamCardWithKPI } from '@/components/cards/TeamCardWithKPI';
import { calculateOfficeKPI, KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfficeManagerDashboardProps {
  userId: string;
}

interface OfficeData {
  id: string;
  name: string;
  city_id: string;
  address: string | null;
  teams: Array<{
    id: string;
    name: string;
    office_id: string;
    leader_id: string | null;
    realtors: Array<{
      id: string;
      deals: Array<{ id: string; dealValue: string; dealDate: string }>;
      diagnoses: Array<{ id: string; diagnosisDate: string }>;
    }>;
  }>;
}

const OfficeManagerDashboard = ({ userId }: OfficeManagerDashboardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [officeData, setOfficeData] = useState<OfficeData | null>(null);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [userInfo, setUserInfo] = useState({ fullName: '', email: '', role: 'Мениджър на офис' });
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const fetchUserInfo = useCallback(async () => {
    try {
      const { user } = await api.getCurrentUser();
      if (user) {
        setUserInfo({
          fullName: user.full_name || user.email,
          email: user.email,
          role: 'Мениджър на офис'
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);

  const fetchOfficeData = useCallback(async () => {
    setLoading(true);
    try {
      // Find office where user is manager
      // First, we need to find which office the user manages
      // This requires a new field in profiles or a separate office_managers table
      // For now, we'll use a workaround: find office by checking if user is in that city
      
      // Get user's profile to find city association
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!profile) throw new Error('Profile not found');

      // For now, we'll need to add office_manager_id to offices table
      // This is a simplified version - in production, you'd have a proper relationship
      const { data: offices, error: officesError } = await supabase
        .from('offices')
        .select(`
          id,
          name,
          city_id,
          address,
          teams (
            id,
            name,
            office_id,
            leader_id,
            realtors (
              id,
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
          )
        `);

      if (officesError) throw officesError;

      // For now, show first office - in production, filter by office_manager_id
      const office = offices?.[0];
      if (!office) throw new Error('No office found');

      const transformedOffice: OfficeData = {
        id: office.id,
        name: office.name,
        city_id: office.city_id,
        address: office.address,
        teams: (office.teams || []).map((t: { id: string; name: string; office_id: string; leader_id?: string | null; realtors?: Array<{ id: string; deals?: unknown[]; diagnoses?: unknown[] }> }) => ({
          id: t.id,
          name: t.name,
          office_id: t.office_id,
          leader_id: t.leader_id,
          realtors: (t.realtors || []).map((r: { id: string; deals?: unknown[]; diagnoses?: unknown[] }) => ({
            id: r.id,
            deals: r.deals || [],
            diagnoses: r.diagnoses || [],
          })),
        })),
      };

      setOfficeData(transformedOffice);

      // Calculate KPI for entire office
      const allRealtorData = transformedOffice.teams.flatMap(team =>
        team.realtors.map(r => ({
          id: r.id,
          deals: r.deals.map((d: Record<string, unknown>) => ({
            value: parseFloat(String(d.deal_value || d.dealValue || '0')),
            date: String(d.deal_date || d.dealDate),
          })),
          diagnoses: r.diagnoses.map((d: Record<string, unknown>) => ({
            date: String(d.diagnosis_date || d.diagnosisDate),
          })),
        }))
      );

      const kpi = calculateOfficeKPI(allRealtorData);
      setKpiMetrics(kpi);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching office data:', error);
      toast.error(message || 'Грешка при зареждане на данни');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOfficeData();
    fetchUserInfo();
  }, [fetchOfficeData, fetchUserInfo]);

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
        </div>
      </div>
    );
  }

  if (!officeData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Няма намерен офис</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Не сте назначени като мениджър на офис.
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
              <h1 className="text-xl font-bold">Офис: {officeData.name}</h1>
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
                    exportKPIData(kpiMetrics, `kpi-office-${officeData.name}-${new Date().toISOString().split('T')[0]}`);
                    toast.success('KPI данните са експортирани');
                  }
                }}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  KPI данни
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Настройки на акаунта
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NotificationCenter />
            <AccountSettingsDialog
              open={accountSettingsOpen}
              onOpenChange={setAccountSettingsOpen}
              userInfo={{
                fullName: userInfo.fullName,
                email: userInfo.email,
              }}
              onUpdate={fetchUserInfo}
              onLogout={handleLogout}
            />
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

        {/* Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Екипи в офиса
            </CardTitle>
          </CardHeader>
          <CardContent>
            {officeData.teams.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Няма екипи в този офис
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officeData.teams.map((team) => {
                  const teamRealtorData = team.realtors.map(r => ({
                    id: r.id,
                    deals: r.deals.map((d: Record<string, unknown>) => ({
                      value: parseFloat(String(d.deal_value || d.dealValue || '0')),
                      date: String(d.deal_date || d.dealDate),
                    })),
                    diagnoses: r.diagnoses.map((d: Record<string, unknown>) => ({
                      date: String(d.diagnosis_date || d.diagnosisDate),
                    })),
                  }));

                  return (
                    <TeamCardWithKPI
                      key={team.id}
                      team={{
                        id: team.id,
                        name: team.name,
                        office_id: team.office_id,
                        leader_id: team.leader_id,
                        realtorData: teamRealtorData,
                      }}
                      onSelect={() => {}}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfficeManagerDashboard;

