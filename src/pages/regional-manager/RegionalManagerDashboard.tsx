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
import { LogOut, Building2, Users, TrendingUp, Download, BarChart3, MapPin } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { exportKPIData } from '@/lib/export';
import { CityCardWithKPI } from '@/components/cards/CityCardWithKPI';
import { calculateCityKPI, RealtorData, KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RegionalManagerDashboardProps {
  userId: string;
}

interface CityData {
  id: string;
  name: string;
  country_id: string;
  offices: Array<{
    id: string;
    name: string;
    city_id: string;
    teams: Array<{
      id: string;
      name: string;
      realtors: Array<{
        id: string;
        deals: Array<{ id: string; dealValue: string; dealDate: string }>;
        diagnoses: Array<{ id: string; diagnosisDate: string }>;
      }>;
    }>;
  }>;
}

const RegionalManagerDashboard = ({ userId }: RegionalManagerDashboardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<CityData[]>([]);
  const [userInfo, setUserInfo] = useState({ fullName: '', email: '', role: 'Регионален мениджър' });

  useEffect(() => {
    fetchCitiesData();
    fetchUserInfo();
  }, [userId, fetchCitiesData]);

  const fetchUserInfo = async () => {
    try {
      const { user } = await api.getCurrentUser();
      if (user) {
        setUserInfo({
          fullName: user.full_name || user.email,
          email: user.email,
          role: 'Регионален мениджър'
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchCitiesData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Find cities where user is regional manager
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select(`
          id,
          name,
          country_id,
          offices (
            id,
            name,
            city_id,
            teams (
              id,
              name,
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
          )
        `)
        .eq('manager_id', userId);

      if (citiesError) throw citiesError;

      const transformedCities: CityData[] = (citiesData || []).map((city: Record<string, unknown>) => ({
        id: city.id as string,
        name: city.name as string,
        country_id: city.country_id as string,
        offices: ((city.offices as Record<string, unknown>[]) || []).map((office: Record<string, unknown>) => ({
          id: office.id as string,
          name: office.name as string,
          city_id: office.city_id as string,
          teams: ((office.teams as Record<string, unknown>[]) || []).map((team: Record<string, unknown>) => ({
            id: team.id as string,
            name: team.name as string,
            realtors: ((team.realtors as Record<string, unknown>[]) || []).map((r: Record<string, unknown>) => ({
              id: r.id as string,
              deals: (r.deals as unknown[]) || [],
              diagnoses: (r.diagnoses as unknown[]) || [],
            })),
          })),
        })),
      }));

      setCities(transformedCities);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching cities data:', error);
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
        </div>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Няма намерени градове</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Не сте назначени като регионален мениджър на градове.
            </p>
            <Button onClick={handleLogout} className="mt-4 w-full" variant="outline">
              Изход
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate KPI for all cities combined
  const allRealtorData: RealtorData[] = cities.flatMap(city =>
    city.offices.flatMap(office =>
      office.teams.flatMap(team =>
        team.realtors.map(r => ({
          id: r.id,
          deals: r.deals.map((d: any) => ({
            value: parseFloat(d.deal_value || d.dealValue || '0'),
            date: d.deal_date || d.dealDate,
          })),
          diagnoses: r.diagnoses.map((d: any) => ({
            date: d.diagnosis_date || d.diagnosisDate,
          })),
        }))
      )
    )
  );

  const totalKPI = calculateCityKPI(allRealtorData);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold">Регионален мениджър</h1>
              <p className="text-sm text-muted-foreground">{userInfo.fullName}</p>
              <p className="text-xs text-muted-foreground">
                Градове: {cities.map(c => c.name).join(', ')}
              </p>
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
                  exportKPIData(totalKPI, `kpi-regional-${new Date().toISOString().split('T')[0]}`);
                  toast.success('KPI данните са експортирани');
                }}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  KPI данни (Всички градове)
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
        {/* Total KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Диагнози (Общо)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKPI?.diagnoses || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Сделки (Общо)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKPI?.deals || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Успеваемост (Общо)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatSuccessRate(totalKPI?.successRate || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Градове
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Няма градове под управление
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cities.map((city) => {
                  const cityRealtorData: RealtorData[] = city.offices.flatMap(office =>
                    office.teams.flatMap(team =>
                      team.realtors.map(r => ({
                        id: r.id,
                        deals: r.deals.map((d: any) => ({
                          value: parseFloat(d.deal_value || d.dealValue || '0'),
                          date: d.deal_date || d.dealDate,
                        })),
                        diagnoses: r.diagnoses.map((d: any) => ({
                          date: d.diagnosis_date || d.diagnosisDate,
                        })),
                      }))
                    )
                  );

                  const cityKPI = calculateCityKPI(cityRealtorData);

                  return (
                    <CityCardWithKPI
                      key={city.id}
                      city={{
                        id: city.id,
                        name: city.name,
                        country_id: city.country_id,
                        realtorData: cityRealtorData,
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

export default RegionalManagerDashboard;

