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
import { Settings, Download, BarChart3, Menu, ChevronDown, ChevronLeft, Calendar, CheckCircle2 } from 'lucide-react';
import { exportKPIData } from '@/lib/export';
import { toast } from 'sonner';
import {
  calculateOfficeKPI,
  calculateTeamKPI,
  KPIMetrics,
  formatSuccessRate,
} from '@/utils/kpiCalculations';
import { TeamCardWithKPI } from '@/components/cards/TeamCardWithKPI';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import { TrainingManagementDialog } from '@/components/TrainingManagementDialog';
import logo from '@/assets/logo.jpeg';
import { LogOut, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ViewLevel = 'teams' | 'realtors' | 'realtor-detail';

interface Office {
  id: string;
  name: string;
  city_id: string;
  address: string | null;
  city?: {
    id: string;
    name: string;
    country?: {
      id: string;
      name: string;
    };
  };
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

interface OfficeManagerDashboardProps {
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

const OfficeManagerDashboard = ({ userId }: OfficeManagerDashboardProps) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewLevel>('teams');
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedRealtor, setSelectedRealtor] = useState<Realtor | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedRealtorForTraining, setSelectedRealtorForTraining] = useState<{ id: string; name: string } | null>(null);

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
          role: 'Мениджър на офис'
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);

  const fetchOfficeData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Find office where user is manager with city and country info
      const { data: officesData, error: officesError } = await supabase
        .from('offices')
        .select(`
          id, 
          name, 
          city_id, 
          address,
          city:cities (
            id,
            name,
            country:countries (
              id,
              name
            )
          )
        `)
        .eq('manager_id', userId)
        .limit(1)
        .single();

      if (officesError) throw officesError;

      if (officesData) {
        const officeData: Office = {
          id: officesData.id,
          name: officesData.name,
          city_id: officesData.city_id,
          address: officesData.address,
          city: officesData.city as { id: string; name: string; country?: { id: string; name: string } } | undefined
        };
        setOffice(officeData);
        fetchTeams(officeData.id);
        fetchOfficeKPI(officeData.id);
      }
    } catch (error) {
      console.error('Error fetching office data:', error);
      toast.error('Грешка при зареждане на офис');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOfficeData();
    fetchUserInfo();
  }, [fetchOfficeData, fetchUserInfo]);

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

    if (currentView === 'teams') {
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
      if (office) {
        fetchTeams(office.id);
        fetchOfficeKPI(office.id);
      }
    }
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (office?.city?.country) parts.push(office.city.country.name);
    if (office?.city) parts.push(office.city.name);
    if (office) parts.push(office.name);
    if (selectedTeam) parts.push(selectedTeam.name);
    return parts.join(' / ');
  };

  if (loading && !office) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="h-20 w-full bg-muted animate-pulse rounded" />
          <div className="h-64 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!office) {
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
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button 
                onClick={() => setCurrentView('teams')} 
                className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              >
                <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">
                  {office.city?.country?.name || 'България'} → {office.city?.name || 'Бургас'} → {office.name}
                </h1>
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
              {currentView !== 'teams' && (
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
                      exportKPIData(kpiMetrics, `kpi-office-${office.name}-${new Date().toISOString().split('T')[0]}`);
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
                  currentView === 'teams' ? teams.map(t => t.id) :
                  currentView === 'realtors' ? realtors.map(r => r.id) : []
                }
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
                        <div className="relative group">
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRealtorForTraining({ id: realtor.id, name: realtor.user.fullName });
                              setTrainingDialogOpen(true);
                            }}
                          >
                            <GraduationCap className="h-4 w-4 mr-1" />
                            Обучение
                          </Button>
                        </div>
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

      {/* Training Management Dialog */}
      {selectedRealtorForTraining && (
        <TrainingManagementDialog
          open={trainingDialogOpen}
          onOpenChange={setTrainingDialogOpen}
          realtorId={selectedRealtorForTraining.id}
          realtorName={selectedRealtorForTraining.name}
        />
      )}
    </div>
  );
};

export default OfficeManagerDashboard;
