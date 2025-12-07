import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Settings, Users, Download, BarChart3, Menu, ChevronDown, ChevronLeft, Home, Calendar, CheckCircle2 } from 'lucide-react';
import { exportKPIData } from '@/lib/export';
import { TopologySidebar } from '@/components/TopologySidebar';
import { transformOffices } from '@/utils/dataTransform';
import { Office as UIOffice } from '@/types';
import { toast } from 'sonner';
import {
  calculateCityKPI,
  calculateOfficeKPI,
  calculateTeamKPI,
  RealtorData,
  KPIMetrics,
  formatSuccessRate,
} from '@/utils/kpiCalculations';
import { CityCardWithKPI } from '@/components/cards/CityCardWithKPI';
import { OfficeCardWithKPI } from '@/components/cards/OfficeCardWithKPI';
import { TeamCardWithKPI } from '@/components/cards/TeamCardWithKPI';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import logo from '@/assets/logo.jpeg';
import { LogOut } from 'lucide-react';

type ViewLevel = 'cities' | 'offices' | 'teams' | 'realtors' | 'realtor-detail';

interface City {
  id: string;
  name: string;
  country_id: string;
}

interface Office {
  id: string;
  name: string;
  city_id: string;
  address: string | null;
}

interface Team {
  id: string;
  name: string;
  office_id: string;
  leader_id: string | null;
}

interface Realtor {
  id: string;
  userId: string;
  teamId: string | null;
  level: number;
  user: {
    fullName: string;
    email: string;
  };
}

interface RegionalManagerDashboardProps {
  userId: string;
}

// Sortable Card Wrapper Component
const SortableCard = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", className)}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded p-1"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
};

const RegionalManagerDashboard = ({ userId }: RegionalManagerDashboardProps) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewLevel>('cities');
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedRealtor, setSelectedRealtor] = useState<Realtor | null>(null);
  const [topologyOffices, setTopologyOffices] = useState<UIOffice[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [showKPI, setShowKPI] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchUserInfo = useCallback(async () => {
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
  }, []);

  const fetchTopologyData = useCallback(async () => {
    try {
      const dbOffices = await api.getAllOfficesFull();
      const transformedOffices = transformOffices(dbOffices);
      // Filter offices to only show cities where user is regional manager
      const filteredOffices = transformedOffices.filter(office => {
        // Check if office's city has this user as manager
        return cities.some(city => city.id === office.city?.id);
      });
      setTopologyOffices(filteredOffices);
    } catch (error) {
      console.error('Error fetching topology data:', error);
    }
  }, [cities]);

  const fetchCities = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name, country_id')
        .eq('manager_id', userId);

      if (citiesError) throw citiesError;

      const mapped = (citiesData || []).map((city: { id: string; name: string; country_id: string }) => ({
        id: city.id,
        name: city.name,
        country_id: city.country_id
      }));
      setCities(mapped);
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast.error('Грешка при зареждане на градове');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCities();
    fetchUserInfo();
  }, [fetchCities, fetchUserInfo]);

  useEffect(() => {
    if (cities.length > 0) {
      fetchTopologyData();
    }
  }, [cities, fetchTopologyData]);

  const fetchOffices = async (cityId: string) => {
    setLoading(true);
    try {
      const data = await api.getOfficesByCity(cityId);
      const mapped = data.map((office: { id: string; name: string; cityId: string; address?: string | null }) => ({
        id: office.id,
        name: office.name,
        city_id: office.cityId,
        address: office.address
      }));
      setOffices(mapped);
    } catch (error) {
      console.error('Error fetching offices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async (officeId: string) => {
    setLoading(true);
    try {
      const data = await api.getTeamsByOffice(officeId);
      const mapped = data.map((team: { id: string; name: string; officeId: string; leaderId?: string | null }) => ({
        id: team.id,
        name: team.name,
        office_id: team.officeId,
        leader_id: team.leaderId
      }));
      setTeams(mapped);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtors = async (teamId: string) => {
    setLoading(true);
    try {
      const data = await api.getRealtorsByTeam(teamId);
      const mapped = data.map((realtor: { id: string; user_id: string; team_id: string; level: number; profile?: { full_name?: string; email?: string } }) => ({
        id: realtor.id,
        userId: realtor.user_id,
        teamId: realtor.team_id,
        level: realtor.level,
        user: {
          fullName: realtor.profile?.full_name || 'Неизвестен',
          email: realtor.profile?.email || ''
        }
      }));
      setRealtors(mapped);
    } catch (error) {
      console.error('Error fetching realtors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    if (currentView === 'cities') {
      setCities((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    } else if (currentView === 'offices') {
      setOffices((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    } else if (currentView === 'teams') {
      setTeams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    } else if (currentView === 'realtors') {
      setRealtors((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const fetchCityKPI = async (cityId: string) => {
    try {
      const kpi = await api.getCityKPI(cityId);
      setKpiMetrics(kpi);
      setShowKPI(true);
    } catch (error) {
      console.error('Error fetching city KPI:', error);
      setShowKPI(false);
    }
  };

  const handleCityClick = (city: City) => {
    setSelectedCity(city);
    setCurrentView('offices');
    fetchOffices(city.id);
    fetchCityKPI(city.id);
  };

  const fetchOfficeKPI = async (officeId: string) => {
    try {
      const kpi = await api.getOfficeKPI(officeId);
      setKpiMetrics(kpi);
      setShowKPI(true);
    } catch (error) {
      console.error('Error fetching office KPI:', error);
      setShowKPI(false);
    }
  };

  const handleOfficeClick = (office: Office) => {
    setSelectedOffice(office);
    setCurrentView('teams');
    fetchTeams(office.id);
    fetchOfficeKPI(office.id);
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setCurrentView('realtors');
    fetchRealtors(team.id);
  };

  const handleBack = () => {
    if (currentView === 'realtor-detail') {
      setCurrentView('realtors');
      setSelectedRealtor(null);
      return;
    }
    if (currentView === 'realtors') {
      setCurrentView('teams');
      setSelectedTeam(null);
      if (selectedOffice) {
        fetchTeams(selectedOffice.id);
        fetchOfficeKPI(selectedOffice.id);
      }
    } else if (currentView === 'teams') {
      setCurrentView('offices');
      setSelectedOffice(null);
      if (selectedCity) {
        fetchOffices(selectedCity.id);
        fetchCityKPI(selectedCity.id);
      }
    } else if (currentView === 'offices') {
      setCurrentView('cities');
      setSelectedCity(null);
      setShowKPI(false);
    }
  };

  const handleHome = () => {
    setCurrentView('cities');
    setSelectedCity(null);
    setSelectedOffice(null);
    setSelectedTeam(null);
    setShowKPI(false);
    fetchCities();
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedOffice) parts.push(selectedOffice.name);
    if (selectedTeam) parts.push(selectedTeam.name);
    return parts.join(' / ');
  };

  const handleTopologyOfficeClick = async (office: UIOffice) => {
    // Find the city for this office
    const city = cities.find(c => c.id === office.city?.id);
    if (city) {
      setSelectedCity(city);
      fetchOffices(city.id);
      fetchCityKPI(city.id);
    }
    setSelectedOffice({ id: office.id, name: office.name, city_id: office.city?.id || '', address: office.address || null });
    fetchTeams(office.id);
    setCurrentView('teams');
  };

  if (loading && cities.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="h-20 w-full bg-muted animate-pulse rounded" />
          <div className="h-64 w-full bg-muted animate-pulse rounded" />
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Topology Sidebar */}
      <TopologySidebar
        offices={topologyOffices}
        onOfficeClick={handleTopologyOfficeClick}
        selectedOfficeId={selectedOffice?.id}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        mode="admin"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <button 
                onClick={handleHome} 
                className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              >
                <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">Регионален мениджър</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{getBreadcrumb()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/training-calendar')} variant="outline" size="sm" className="text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Календар</span>
              </Button>
              <Button onClick={() => navigate('/training-progress')} variant="outline" size="sm" className="text-xs sm:text-sm">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Обучение</span>
              </Button>
              {currentView !== 'cities' && (
                <Button onClick={handleBack} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>Назад</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Експорт</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Експорт на данни</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {kpiMetrics && (
                    <DropdownMenuItem onClick={() => {
                      exportKPIData(kpiMetrics, `kpi-regional-${new Date().toISOString().split('T')[0]}`);
                      toast.success('KPI данните са експортирани');
                    }}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      KPI данни
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Настройки на акаунта
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo?.email || 'user'}`} />
                        <AvatarFallback className="text-[10px] sm:text-xs">
                          {userInfo?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{userInfo?.fullName || 'Акаунт'}</span>
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userInfo?.fullName || 'Потребител'}</p>
                      <p className="text-xs text-muted-foreground">{userInfo?.email || ''}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Роля: {userInfo?.role || 'Неизвестна'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Настройки на акаунта
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Изход
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {loading ? (
          <div className="text-center text-muted-foreground">Зареждане...</div>
        ) : (
          <>
            {/* KPI Cards */}
            {showKPI && kpiMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Диагнози
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiMetrics.diagnoses || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Сделки
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiMetrics.deals || 0}</div>
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
                      {formatSuccessRate(kpiMetrics.successRate || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={
                  currentView === 'cities' ? cities.map(c => c.id) :
                  currentView === 'offices' ? offices.map(o => o.id) :
                  currentView === 'teams' ? teams.map(t => t.id) :
                  currentView === 'realtors' ? realtors.map(r => r.id) : []
                }
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {currentView === 'cities' && cities.map((city) => (
                    <SortableCard key={city.id} id={city.id}>
                      <CityCardWithKPI
                        city={{ ...city, countryName: 'България' }}
                        onClick={() => handleCityClick(city)}
                      />
                    </SortableCard>
                  ))}

                  {currentView === 'offices' && offices.map((office) => (
                    <SortableCard key={office.id} id={office.id}>
                      <OfficeCardWithKPI
                        office={office}
                        onClick={() => handleOfficeClick(office)}
                      />
                    </SortableCard>
                  ))}

                  {currentView === 'teams' && teams.map((team) => (
                    <SortableCard key={team.id} id={team.id}>
                      <TeamCardWithKPI
                        team={team}
                        onClick={() => handleTeamClick(team)}
                      />
                    </SortableCard>
                  ))}

                  {currentView === 'realtors' && realtors.map((realtor) => (
                    realtor.user && (
                      <SortableCard key={realtor.id} id={realtor.id}>
                        <RealizatorCardWithKPI
                          realtor={{
                            id: realtor.id,
                            name: realtor.user.fullName,
                            email: realtor.user.email,
                            level: realtor.level,
                            confidence: false,
                            salesResilience: false,
                            successMindset: false
                          }}
                          onClick={() => {
                            setSelectedRealtor(realtor);
                            setCurrentView('realtor-detail');
                          }}
                        />
                      </SortableCard>
                    )
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </main>
      </div>

      {/* Account Settings Dialog */}
      {userInfo && (
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
      )}
    </div>
  );
};

export default RegionalManagerDashboard;
