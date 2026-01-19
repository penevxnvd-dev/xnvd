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
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Menu, ChevronLeft, Home, Plus, Pencil, Trash2, Calendar, ChevronDown, FileText, Target, CheckCircle2, XCircle, Award, TrendingUp, GraduationCap, BarChart3, Users, Settings, Download, BookOpen, LogOut, Stethoscope, ClipboardCheck, Activity, Handshake, DollarSign, Percent } from 'lucide-react';
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
// Avatar removed - using modern design with initials badges instead
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { UserManagementDialog } from '@/components/UserManagementDialog';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useUserRole } from '@/hooks/useUserRole';
import { hasPermission } from '@/utils/permissions';
import { exportKPIData, exportDeals, exportDiagnoses } from '@/lib/export';
import { toast } from 'sonner';
import {
  calculateTeamKPI,
  KPIMetrics,
  formatSuccessRate,
} from '@/utils/kpiCalculations';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import { TrainingManagementDialog } from '@/components/TrainingManagementDialog';
import { TopologySidebar } from '@/components/TopologySidebar';
import { transformOffices } from '@/utils/dataTransform';
import { Office as UIOffice } from '@/types';
import { trainingStructure, calculateTrainingProgress, TrainingSection, isTrainingFullyCompleted } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { Progress } from '@/components/ui/progress';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { supabaseApi } from '@/lib/supabaseApi';
import { useMemo } from 'react';
import { StatBadge } from '@/components/StatBadge';

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
  const [selectedRealtorKPI, setSelectedRealtorKPI] = useState<KPIMetrics | null>(null);
  const [selectedRealtorDeals, setSelectedRealtorDeals] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRealtorDiagnoses, setSelectedRealtorDiagnoses] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRealtorTrainingData, setSelectedRealtorTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [selectedRealtorTrainingProgress, setSelectedRealtorTrainingProgress] = useState(0);
  const [topologyOffices, setTopologyOffices] = useState<UIOffice[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : false; // Default to closed
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedRealtorForTraining, setSelectedRealtorForTraining] = useState<{ id: string; name: string } | null>(null);
  const { role } = useUserRole();

  const [loading, setLoading] = useState(true);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [showKPI, setShowKPI] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [realtorFilter, setRealtorFilter] = useState<'all' | 'trainees' | 'realtors'>('all');

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


  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (team) parts.push(team.name);
    if (currentView === 'realtor-detail' && selectedRealtor) {
      parts.push(selectedRealtor.user.fullName);
    }
    return parts.join(' / ');
  };

  // Filter realtors based on selected filter
  const filteredRealtors = useMemo(() => {
    if (realtorFilter === 'trainees') {
      return realtors.filter(r => r.level === 1);
    } else if (realtorFilter === 'realtors') {
      return realtors.filter(r => r.level > 1);
    }
    return realtors;
  }, [realtors, realtorFilter]);

  const handleHome = () => {
    setCurrentView('realtors');
    setSelectedRealtor(null);
  };

  const handleTrainingProgressUpdate = async (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => {
    if (!selectedRealtor) return;

    // Update local state
    const updatedData = selectedRealtorTrainingData.map((section) => {
      if (section.id === sectionId) {
        return {
          ...section,
          subsections: section.subsections.map((subsection) => {
            if (subsection.id === subsectionId) {
              const newProgress = {
                ...subsection.progress,
                [field]: checked,
              };
              
              // If exam is passed, automatically mark all other steps as completed
              if (field === 'exam' && checked) {
                return {
                  ...subsection,
                  progress: {
                    lecture: true,
                    video: true,
                    practical: true,
                    handover: true,
                    exam: true,
                  },
                };
              }
              
              return {
                ...subsection,
                progress: newProgress,
              };
            }
            return subsection;
          }),
        };
      }
      return section;
    });

    setSelectedRealtorTrainingData(updatedData);
    setSelectedRealtorTrainingProgress(calculateTrainingProgress(updatedData));

    // Save to database
    try {
      const subsection = updatedData
        .find((s) => s.id === sectionId)
        ?.subsections.find((ss) => ss.id === subsectionId);

      if (subsection) {
        await api.updateTrainingProgress({
          realtorId: selectedRealtor.id,
          section: sectionId,
          subsection: subsectionId,
          lectureCompleted: subsection.progress.lecture,
          videoCompleted: subsection.progress.video,
          practicalCompleted: subsection.progress.practical,
          handoverCompleted: subsection.progress.handover,
          examCompleted: subsection.progress.exam,
        });

        // Check if training is fully completed and promote trainee to realtor
        if (isTrainingFullyCompleted(updatedData) && selectedRealtor.userId) {
          try {
            await supabaseApi.promoteTraineeToRealtor(selectedRealtor.userId, team?.id || undefined);
            toast.success('🎉 Обучението е завършено! Курсистът е повишен до Реализатор.');
          } catch (error) {
            console.error('Error promoting trainee:', error);
            // Don't show error to user, just log it
          }
        }

        // Show success message
        if (field === 'exam' && checked) {
          toast.success('Изпитът е минат! Подточката е завършена.');
        } else {
          toast.success('Прогресът е обновен');
        }
      }
    } catch (error: unknown) {
      toast.error('Грешка при запазване на прогреса');
      console.error(error);
    }
  };

  // Fetch topology data for sidebar
  useEffect(() => {
    const fetchTopology = async () => {
      if (!team) return;
      try {
        const offices = await api.getAllOfficesFull();
        // Filter to only show the office that contains this team
        const teamOffice = offices.find((o: { teams?: Array<{ id?: string }> }) => 
          o.teams?.some((t: { id?: string }) => t.id === team.id)
        );
        if (teamOffice) {
          const transformed = transformOffices([teamOffice]);
          setTopologyOffices(transformed);
        }
      } catch (error) {
        console.error('Error fetching topology:', error);
      }
    };
    if (team) {
      fetchTopology();
    }
  }, [team]);

  // Early returns after all hooks
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

  const customNavbarContent = (
    <>
      {/* Compact KPI Cards */}
      {showKPI && kpiMetrics && (
        <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4">
          <StatBadge
            icon={Stethoscope}
            value={kpiMetrics.diagnoses || 0}
            title="Диагнози"
            colorScheme="pink"
          />
          <StatBadge
            icon={Handshake}
            value={kpiMetrics.deals || 0}
            title="Сделки"
            colorScheme="amber"
          />
          <StatBadge
            icon={BarChart3}
            value={formatSuccessRate(kpiMetrics.successRate || 0)}
            title="Успеваемост"
            colorScheme="green"
          />
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Topology Sidebar - Custom for TeamLeader */}
      <TopologySidebar
        offices={topologyOffices}
        onOfficeClick={() => {}}
        onLeaderClick={() => {}}
        onAgentClick={() => {}}
        selectedOfficeId={team?.office_id}
        selectedLeaderId={team?.leader_id || undefined}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        mode="team-leader"
        showQuickActions={true}
        onTrainingCalendarClick={() => navigate('/training-calendar')}
        onTrainingListClick={() => navigate('/training-list')}
        onBackClick={handleBack}
        showBackButton={currentView === 'realtor-detail'}
        onExportClick={() => {
          if (kpiMetrics) {
            exportKPIData(kpiMetrics, `kpi-team-${team?.name}-${new Date().toISOString().split('T')[0]}`);
            toast.success('KPI данните са експортирани');
          }
        }}
        role="team_leader"
        teamName={team?.name ? `Екип: ${team.name}` : undefined}
        breadcrumb={getBreadcrumb()}
      />

      {/* Main Content with AppLayout navbar */}
      <AppLayout
        showSidebar={false}
        customNavbarContent={customNavbarContent}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      >
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {loading ? (
          <div className="space-y-6">
            {/* Loading Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="p-4">
                    <div className="h-4 w-24 bg-muted rounded" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-8 w-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-32 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Statistics and Filters for Realtors View */}
            {currentView === 'realtors' && (
              <div className="space-y-6">
                {/* Modern Statistics Cards with Animations */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-card to-card/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardHeader className="p-4 sm:p-6 relative">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-semibold">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          </div>
                          <span>Всички</span>
                        </CardTitle>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 relative">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                          {realtors.length}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">члена</span>
                      </div>
                      <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group relative overflow-hidden border-2 border-transparent hover:border-blue-500/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-blue-50/50 dark:from-blue-950/20 to-card">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardHeader className="p-4 sm:p-6 relative">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-semibold">
                          <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span>Нови курсисти</span>
                        </CardTitle>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                          Нови
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 relative">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                          {realtors.filter(r => r.level === 1).length}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">курсисти</span>
                      </div>
                      <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500" 
                          style={{ width: `${realtors.length > 0 ? (realtors.filter(r => r.level === 1).length / realtors.length) * 100 : 0}%` }} 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group relative overflow-hidden border-2 border-transparent hover:border-green-500/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-green-50/50 dark:from-green-950/20 to-card">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardHeader className="p-4 sm:p-6 relative">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-semibold">
                          <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                            <Award className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <span>Завършили</span>
                        </CardTitle>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Готови
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 relative">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">
                          {realtors.filter(r => r.level > 1).length}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">реализатори</span>
                      </div>
                      <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500" 
                          style={{ width: `${realtors.length > 0 ? (realtors.filter(r => r.level > 1).length / realtors.length) * 100 : 0}%` }} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Modern Filter Tabs with Better Styling */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button
                    variant={realtorFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRealtorFilter('all')}
                    className={cn(
                      "transition-all duration-200",
                      realtorFilter === 'all' 
                        ? "shadow-md scale-105 bg-gradient-to-r from-primary to-primary/90" 
                        : "hover:scale-105 hover:shadow-sm"
                    )}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Всички
                    <Badge variant="secondary" className="ml-2 bg-background/50">
                      {realtors.length}
                    </Badge>
                  </Button>
                  <Button
                    variant={realtorFilter === 'trainees' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRealtorFilter('trainees')}
                    className={cn(
                      "transition-all duration-200",
                      realtorFilter === 'trainees' 
                        ? "shadow-md scale-105 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600" 
                        : "hover:scale-105 hover:shadow-sm hover:border-blue-500/50"
                    )}
                  >
                    <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                    Нови курсисти
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-2",
                        realtorFilter === 'trainees' 
                          ? "bg-white/20 text-white border-white/30" 
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      )}
                    >
                      {realtors.filter(r => r.level === 1).length}
                    </Badge>
                  </Button>
                  <Button
                    variant={realtorFilter === 'realtors' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRealtorFilter('realtors')}
                    className={cn(
                      "transition-all duration-200",
                      realtorFilter === 'realtors' 
                        ? "shadow-md scale-105 bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600" 
                        : "hover:scale-105 hover:shadow-sm hover:border-green-500/50"
                    )}
                  >
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    Завършили
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-2",
                        realtorFilter === 'realtors' 
                          ? "bg-white/20 text-white border-white/30" 
                          : "bg-green-500/10 text-green-700 dark:text-green-300"
                      )}
                    >
                      {realtors.filter(r => r.level > 1).length}
                    </Badge>
                  </Button>
                </div>

                {/* Attention Section for New Trainees */}
                {realtorFilter === 'trainees' && realtors.filter(r => r.level === 1).length > 0 && (
                  <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/50 dark:from-blue-950/30 to-card animate-in slide-in-from-top-4 duration-500">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-blue-500/10">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            Нови курсисти - Требува внимание
                            <Badge className="bg-blue-500 text-white animate-pulse">
                              {realtors.filter(r => r.level === 1).length}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Тези курсисти изискват подкрепа и насоки за успешно завършване на обучението
                          </p>
                        </div>
                        <Button
                          onClick={() => navigate('/training-list')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Виж обучението
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                )}

                {/* Empty State */}
                {filteredRealtors.length === 0 && (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {realtorFilter === 'trainees' 
                          ? 'Няма нови курсисти' 
                          : realtorFilter === 'realtors' 
                          ? 'Няма завършили реализатори'
                          : 'Няма реализатори в екипа'}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                        {realtorFilter === 'trainees'
                          ? 'В момента няма нови курсисти, които да изискват внимание.'
                          : realtorFilter === 'realtors'
                          ? 'В момента няма завършили реализатори в екипа.'
                          : 'Екипът все още няма реализатори. Добавете нови членове чрез управлението на акаунти.'}
                      </p>
                      {hasPermission(role, 'manage.users') && (
                        <Button onClick={() => setUserManagementOpen(true)} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Добави нов член
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
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
                  currentView === 'realtors' ? filteredRealtors.map(r => r.id) : []
                }
                strategy={rectSortingStrategy}
              >
                {/* Modern Grid Layout with Better Spacing */}
                {currentView === 'realtors' && filteredRealtors.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                    {filteredRealtors.map((realtor) => (
                      realtor.user && (
                        <SortableCard 
                          key={realtor.id} 
                          id={realtor.id}
                          className="transform transition-all duration-300 hover:scale-105 hover:z-10"
                        >
                          <div className="relative group h-full">
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
                              onClick={async () => {
                              // Fetch full realtor data with all fields
                              try {
                                setSelectedRealtor({
                                  ...realtor,
                                  confidence: false,
                                  salesResilience: false,
                                  successMindset: false,
                                });
                                
                                // Parallelize all API calls
                                const [kpi, deals, diagnoses, trainingProgress] = await Promise.all([
                                  api.getRealtorKPI(realtor.userId),
                                  api.getRealtorDeals(realtor.id),
                                  api.getRealtorDiagnoses(realtor.id),
                                  api.getRealtorTrainingProgress(realtor.id)
                                ]);
                                
                                setSelectedRealtorKPI(kpi);
                                setSelectedRealtorDeals(deals as Array<Record<string, unknown>>);
                                setSelectedRealtorDiagnoses(diagnoses as Array<Record<string, unknown>>);
                                
                                if (trainingProgress && trainingProgress.length > 0) {
                                  const updatedTrainingData = trainingStructure.map((section) => ({
                                    ...section,
                                    subsections: section.subsections.map((subsection) => {
                                      const progressItem = trainingProgress.find(
                                        (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
                                      );
                                      return {
                                        ...subsection,
                                        progress: progressItem
                                          ? {
                                              lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                                              video: (progressItem as { video_completed?: boolean }).video_completed || false,
                                              practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                                              handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                                              exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                                            }
                                          : subsection.progress,
                                      };
                                    }),
                                  }));
                                  setSelectedRealtorTrainingData(updatedTrainingData);
                                  setSelectedRealtorTrainingProgress(calculateTrainingProgress(updatedTrainingData));
                                } else {
                                  setSelectedRealtorTrainingData(trainingStructure);
                                  setSelectedRealtorTrainingProgress(0);
                                }
                                
                                setCurrentView('realtor-detail');
                              } catch (error) {
                                console.error('Error fetching realtor details:', error);
                                toast.error('Грешка при зареждане на детайли');
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 bg-background/95 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-lg"
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
                )}
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <div className="opacity-50">
                    {/* Render a placeholder card here if needed */}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}

        {/* Realtor Detail View */}
        {!loading && currentView === 'realtor-detail' && selectedRealtor && selectedRealtorKPI && (
          <div className="space-y-4 sm:space-y-6">
            {/* Overall Training Progress - At the very top with realtor info */}
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 flex-wrap">
                    {(() => {
                      const { displayName } = formatNameWithoutElevenEleven(selectedRealtor.user.fullName);
                      return (
                        <>
                          <h2 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-50 break-words flex-1 min-w-0">
                            {displayName}
                          </h2>
                          <Badge className={cn(
                            "text-[9px] sm:text-[10px] md:text-xs border font-medium flex-shrink-0",
                            selectedRealtor.level === 1 ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                            (selectedRealtor.level === 2 || selectedRealtor.level === 3) ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' :
                            'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                          )}>
                            {(selectedRealtor.level === 4 || selectedRealtor.level === 5) && <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
                            {selectedRealtor.level === 1 ? 'Чирак' : (selectedRealtor.level === 2 || selectedRealtor.level === 3) ? 'Реализатор' : 'Елит'}
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {(() => {
                      const { shouldShowElevenEleven } = formatNameWithoutElevenEleven(selectedRealtor.user.fullName);
                      return (
                        <>
                          {shouldShowElevenEleven && (
                            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
                              11:11
                            </span>
                          )}
                          <div className="flex items-baseline gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatSuccessRate(selectedRealtorKPI.successRate)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/30">
                        <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide break-words">
                        Диагнози
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{selectedRealtorKPI.diagnoses}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-green-50 dark:bg-green-950/30">
                        <FileText className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide break-words">
                        Сделки
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{selectedRealtorKPI.deals}</p>
                  </div>
                </div>

                {/* Training Progress Header */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm lg:text-base break-words">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                    <span>Обучение - Етап 1</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm lg:text-base flex-shrink-0">
                    {selectedRealtorTrainingProgress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <Progress value={selectedRealtorTrainingProgress} className="h-2 sm:h-3 mb-3 sm:mb-4" />
                <p className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-muted-foreground break-words">
                  Завършени {Math.round((selectedRealtorTrainingProgress / 100) * 17)} от 17 подточки
                </p>
              </CardContent>
            </Card>

            {/* Qualities - Separate section */}
            <div className="p-3 sm:p-6 space-y-4">
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide break-words">
                    Лични качества
                  </span>
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-gray-900 dark:text-gray-50">
                    {[selectedRealtor.confidence, selectedRealtor.salesResilience, selectedRealtor.successMindset].filter(Boolean).length}/3
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-700 dark:text-gray-300 break-words">Увереност</span>
                    {selectedRealtor.confidence ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-700 dark:text-gray-300 break-words">Търговски непукизъм</span>
                    {selectedRealtor.salesResilience ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-700 dark:text-gray-300 break-words">Успешен начин на мислене</span>
                    {selectedRealtor.successMindset ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Deals List - Only show if there are deals */}
            {selectedRealtorDeals.length > 0 && (
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base break-words">Сделки</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {selectedRealtorDeals.map((deal) => (
                      <div
                        key={deal.id as string}
                        className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{deal.client_name as string}</p>
                          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                            {new Date(deal.deal_date as string).toLocaleDateString('bg-BG')}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0">
                          {Number(deal.deal_value).toLocaleString()} лв
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Diagnoses List - Only show if there are diagnoses */}
            {selectedRealtorDiagnoses.length > 0 && (
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base break-words">Диагнози</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {selectedRealtorDiagnoses.map((diagnosis) => (
                      <div
                        key={diagnosis.id as string}
                        className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{diagnosis.client_name as string}</p>
                          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                            {new Date(diagnosis.diagnosis_date as string).toLocaleDateString('bg-BG')}
                          </p>
                        </div>
                        <Badge className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0">{diagnosis.status as string}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Training Sections - Below realtor info */}
            <div className="space-y-3 sm:space-y-4">
              {selectedRealtorTrainingData.map((section) => (
                <TrainingSectionCard
                  key={section.id}
                  section={section}
                  onProgressUpdate={handleTrainingProgressUpdate}
                  editable={true}
                />
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Account Settings Dialog */}
      {userInfo && (
        <AccountSettingsDialog
          open={accountSettingsOpen}
          onOpenChange={setAccountSettingsOpen}
          userInfo={userInfo}
          onUpdate={fetchUserInfo}
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

        {/* User Management Dialog */}
        <UserManagementDialog
          open={userManagementOpen}
          onOpenChange={setUserManagementOpen}
          onUpdate={fetchUserInfo}
        />
      </AppLayout>
    </div>
  );
};

export default TeamLeaderDashboard;
