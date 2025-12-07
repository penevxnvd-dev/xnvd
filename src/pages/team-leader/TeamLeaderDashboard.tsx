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
import { Settings, Download, BarChart3, ChevronDown, Calendar, CheckCircle2 } from 'lucide-react';
import { exportKPIData } from '@/lib/export';
import { toast } from 'sonner';
import {
  calculateTeamKPI,
  KPIMetrics,
  formatSuccessRate,
} from '@/utils/kpiCalculations';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import logo from '@/assets/logo.jpeg';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ViewLevel = 'realtors' | 'realtor-detail';

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

interface TeamLeaderDashboardProps {
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

const TeamLeaderDashboard = ({ userId }: TeamLeaderDashboardProps) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewLevel>('realtors');
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  
  const [selectedRealtor, setSelectedRealtor] = useState<Realtor | null>(null);
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
          role: 'Ръководител на екип'
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);

  const fetchTeamData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Find team where user is leader
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name, office_id, leader_id')
        .eq('leader_id', userId)
        .limit(1)
        .single();

      if (teamError) throw teamError;

      if (teamData) {
        const teamInfo: Team = {
          id: teamData.id,
          name: teamData.name,
          office_id: teamData.office_id,
          leader_id: teamData.leader_id
        };
        setTeam(teamInfo);
        fetchRealtors(teamInfo.id);
        fetchTeamKPI(teamInfo.id);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Грешка при зареждане на екип');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTeamData();
    fetchUserInfo();
  }, [fetchTeamData, fetchUserInfo]);

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

    if (currentView === 'realtors') {
      setRealtors((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const fetchTeamKPI = async (teamId: string) => {
    try {
      const kpi = await api.getTeamKPI(teamId);
      setKpiMetrics(kpi);
      setShowKPI(true);
    } catch (error) {
      console.error('Error fetching team KPI:', error);
      setShowKPI(false);
    }
  };

  const handleBack = () => {
    if (currentView === 'realtor-detail') {
      setCurrentView('realtors');
      setSelectedRealtor(null);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (team) parts.push(team.name);
    return parts.join(' / ');
  };

  if (loading && !team) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="h-20 w-full bg-muted animate-pulse rounded" />
          <div className="h-64 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!team) {
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
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button 
                onClick={() => setCurrentView('realtors')} 
                className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              >
                <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">Екип: {team.name}</h1>
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
              {currentView === 'realtor-detail' && (
                <Button onClick={handleBack} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
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
                      exportKPIData(kpiMetrics, `kpi-team-${team.name}-${new Date().toISOString().split('T')[0]}`);
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
                  currentView === 'realtors' ? realtors.map(r => r.id) : []
                }
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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

export default TeamLeaderDashboard;
