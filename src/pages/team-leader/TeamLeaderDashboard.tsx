import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
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
import { GripVertical, FileText, Target, CheckCircle2, XCircle, Award, TrendingUp, GraduationCap, BarChart3, Users, Stethoscope, Handshake, BookOpen, Plus, Clock, PlayCircle, Video, Briefcase, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { UserManagementDialog } from '@/components/UserManagementDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { hasPermission } from '@/utils/permissions';
import { exportKPIData, exportDeals, exportDiagnoses } from '@/lib/export';
import { toast } from 'sonner';
import {
  KPIMetrics,
  formatSuccessRate,
} from '@/utils/kpiCalculations';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import { TrainingManagementDialog } from '@/components/TrainingManagementDialog';
import { trainingStructure, calculateTrainingProgress, TrainingSection, isTrainingFullyCompleted } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { Progress } from '@/components/ui/progress';
import { formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabaseApi } from '@/lib/supabaseApi';
import { StatBadge } from '@/components/StatBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  confidence?: boolean;
  salesResilience?: boolean;
  successMindset?: boolean;
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

// Мемоизирай компонента за да предотвратиш ненужни ре-рендери
const TeamLeaderDashboard = memo(({ userId }: TeamLeaderDashboardProps) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewLevel>('realtors');
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  
  // Използвай ref за да предотвратиш повторно зареждане на данни
  const hasFetchedData = useRef(false);
  
  const [selectedRealtor, setSelectedRealtor] = useState<Realtor | null>(null);
  const [selectedRealtorKPI, setSelectedRealtorKPI] = useState<KPIMetrics | null>(null);
  const [selectedRealtorDeals, setSelectedRealtorDeals] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRealtorDiagnoses, setSelectedRealtorDiagnoses] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRealtorTrainingData, setSelectedRealtorTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [selectedRealtorTrainingProgress, setSelectedRealtorTrainingProgress] = useState(0);
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
  
  // Training progress tracking state
  const [realtorProgressMap, setRealtorProgressMap] = useState<Record<string, number>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [traineeProgressData, setTraineeProgressData] = useState<Record<string, Record<string, {
    lecture_completed?: boolean;
    video_completed?: boolean;
    practical_completed?: boolean;
    handover_completed?: boolean;
    exam_completed?: boolean;
  }>>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
      const { supabase } = await import('@/integrations/supabase/client');
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
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
      const mapped = data.map((realtor: { id: string; user_id: string; team_id: string | null; level: number; profile?: { full_name?: string; email?: string } }) => ({
        id: realtor.id,
        userId: realtor.user_id,
        teamId: realtor.team_id || null,
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

  const handleLogout = async () => {
    await supabaseApi.logout();
    navigate('/auth');
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

  // Calculate total subsections for progress display
  const totalSubsections = useMemo(() => 
    trainingStructure.reduce((sum, section) => sum + section.subsections.length, 0),
    []
  );

  // Fetch training progress for all realtors
  const fetchAllRealtorsProgress = useCallback(async () => {
    const progressMap: Record<string, number> = {};
    
    for (const realtor of realtors) {
      try {
        const progressData = await supabaseApi.getTrainingProgress(realtor.userId);
        
        if (progressData && progressData.length > 0) {
          const updatedData = trainingStructure.map((section) => ({
            ...section,
            subsections: section.subsections.map((subsection) => {
              const progressItem = progressData.find(
                (p: { section?: string; subsection?: string }) => 
                  p.section === section.id && p.subsection === subsection.id
              );
              const defaultProgress = { lecture: false, video: false, practical: false, handover: false, exam: false };
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
                  : (subsection.progress || defaultProgress),
              };
            }),
          }));
          
          progressMap[realtor.id] = calculateTrainingProgress(updatedData);
        } else {
          progressMap[realtor.id] = 0;
        }
      } catch (error) {
        console.error(`Error fetching progress for ${realtor.id}:`, error);
        progressMap[realtor.id] = 0;
      }
    }
    
    setRealtorProgressMap(progressMap);
  }, [realtors]);

  // Fetch progress when realtors change
  useEffect(() => {
    if (realtors.length > 0) {
      fetchAllRealtorsProgress();
    }
  }, [realtors, fetchAllRealtorsProgress]);

  // Load individual trainee progress for dropdown
  const loadTraineeProgress = async (realtor: Realtor) => {
    if (!realtor.id) return;

    try {
      const progressData = await supabaseApi.getRealtorTrainingProgress(realtor.id);
      const progressMapData: Record<string, {
        lecture_completed?: boolean;
        video_completed?: boolean;
        practical_completed?: boolean;
        handover_completed?: boolean;
        exam_completed?: boolean;
      }> = {};
      
      progressData.forEach((p: { section?: string; subsection?: string; lecture_completed?: boolean; video_completed?: boolean; practical_completed?: boolean; handover_completed?: boolean; exam_completed?: boolean }) => {
        const key = `${p.section}-${p.subsection}`;
        progressMapData[key] = p;
      });

      setTraineeProgressData(prev => ({
        ...prev,
        [realtor.id]: progressMapData
      }));
    } catch (error) {
      console.error('Error loading trainee progress:', error);
    }
  };

  // Toggle training progress section
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Handle toggling progress for a realtor from the list
  const handleListToggleProgress = async (
    realtor: Realtor,
    sectionId: string,
    subsectionId: string,
    progressType: 'lecture' | 'video' | 'practical' | 'handover' | 'exam'
  ) => {
    try {
      const progressKey = `${sectionId}-${subsectionId}`;
      const currentProgress = traineeProgressData[realtor.id]?.[progressKey] || {};
      
      const currentValue = progressType === 'lecture' ? currentProgress.lecture_completed :
                          progressType === 'video' ? currentProgress.video_completed :
                          progressType === 'practical' ? currentProgress.practical_completed :
                          progressType === 'handover' ? currentProgress.handover_completed :
                          currentProgress.exam_completed;

      const newValue = !currentValue;

      await supabaseApi.updateTrainingProgress({
        realtorId: realtor.id,
        section: sectionId,
        subsection: subsectionId,
        lectureCompleted: progressType === 'lecture' ? newValue : currentProgress.lecture_completed,
        videoCompleted: progressType === 'video' ? newValue : currentProgress.video_completed,
        practicalCompleted: progressType === 'practical' ? newValue : currentProgress.practical_completed,
        handoverCompleted: progressType === 'handover' ? newValue : currentProgress.handover_completed,
        examCompleted: progressType === 'exam' ? newValue : currentProgress.exam_completed,
      });

      // Update local state
      setTraineeProgressData(prev => ({
        ...prev,
        [realtor.id]: {
          ...prev[realtor.id],
          [progressKey]: {
            ...currentProgress,
            lecture_completed: progressType === 'lecture' ? newValue : currentProgress.lecture_completed,
            video_completed: progressType === 'video' ? newValue : currentProgress.video_completed,
            practical_completed: progressType === 'practical' ? newValue : currentProgress.practical_completed,
            handover_completed: progressType === 'handover' ? newValue : currentProgress.handover_completed,
            exam_completed: progressType === 'exam' ? newValue : currentProgress.exam_completed,
          }
        }
      }));

      toast.success('Прогресът е обновен');
      
      // Refresh progress map
      await fetchAllRealtorsProgress();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Грешка при обновяване на прогреса');
    }
  };

  // Calculate completed subsections for a realtor
  const getCompletedSubsections = (realtorId: string): number => {
    const progressData = traineeProgressData[realtorId];
    if (!progressData) return 0;
    
    let completed = 0;
    Object.values(progressData).forEach(progress => {
      if (progress.lecture_completed && 
          progress.video_completed && 
          progress.practical_completed && 
          progress.handover_completed && 
          progress.exam_completed) {
        completed++;
      }
    });
    return completed;
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
              const currentProgress = subsection.progress || { lecture: false, video: false, practical: false, handover: false, exam: false };
              const newProgress = {
                ...currentProgress,
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
        const progress = subsection.progress || { lecture: false, video: false, practical: false, handover: false, exam: false };
        await api.updateTrainingProgress({
          realtorId: selectedRealtor.id,
          section: sectionId,
          subsection: subsectionId,
          lectureCompleted: progress.lecture,
          videoCompleted: progress.video,
          practicalCompleted: progress.practical,
          handoverCompleted: progress.handover,
          examCompleted: progress.exam,
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
      <AppLayout
        customNavbarContent={customNavbarContent}
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

            {/* Realtors List View with Training Progress */}
            {currentView === 'realtors' && filteredRealtors.length > 0 && (
              <div className="space-y-3">
                {filteredRealtors.map((realtor) => (
                  realtor.user && (
                    <div key={realtor.id} className="relative w-full">
                      <DropdownMenu 
                        modal={false}
                        open={openDropdown === realtor.id} 
                        onOpenChange={(open) => setOpenDropdown(open ? realtor.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Card
                            className={cn(
                              "transition-all duration-300 hover:shadow-lg hover:scale-[1.01] border-border/60 hover:border-primary/40 cursor-pointer w-full",
                              (realtorProgressMap[realtor.id] || 0) === 100 && "border-2 border-green-500/50 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10"
                            )}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className={cn(
                                    "h-14 w-14 rounded-full flex items-center justify-center text-primary font-bold text-lg border-2 flex-shrink-0 transition-all duration-200",
                                    (realtorProgressMap[realtor.id] || 0) === 100 
                                      ? "bg-gradient-to-br from-green-500/20 to-green-400/10 border-green-500/40 text-green-700 dark:text-green-300" 
                                      : realtor.level === 1 
                                      ? "bg-gradient-to-br from-blue-500/20 to-blue-400/10 border-blue-500/40 text-blue-700 dark:text-blue-300"
                                      : "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30"
                                  )}>
                                    {realtor.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <h3 className="text-base font-semibold text-foreground">
                                        {realtor.user.fullName}
                                      </h3>
                                      <Badge 
                                        variant="outline"
                                        className={cn(
                                          "text-xs font-medium",
                                          realtor.level === 1 
                                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" 
                                            : realtor.level > 3
                                            ? "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                                            : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                        )}
                                      >
                                        {realtor.level === 1 ? 'Курсист' : realtor.level > 3 ? 'Елит' : 'Реализатор'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate mb-1">{realtor.user.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Завършени {getCompletedSubsections(realtor.id)} от {totalSubsections} подточки
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                  <div className="text-right">
                                    <div className={cn(
                                      "text-2xl font-bold mb-2",
                                      (realtorProgressMap[realtor.id] || 0) === 100 ? "text-green-600 dark:text-green-400" : 
                                      (realtorProgressMap[realtor.id] || 0) > 0 ? "text-blue-600 dark:text-blue-400" : 
                                      "text-muted-foreground"
                                    )}>
                                      {realtorProgressMap[realtor.id] || 0}%
                                    </div>
                                    <Progress 
                                      value={realtorProgressMap[realtor.id] || 0} 
                                      className={cn(
                                        "h-2.5 w-full",
                                        (realtorProgressMap[realtor.id] || 0) === 100 && "bg-green-500/20"
                                      )} 
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {(realtorProgressMap[realtor.id] || 0) === 100 ? (
                                      <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Завършено
                                      </Badge>
                                    ) : (realtorProgressMap[realtor.id] || 0) > 0 ? (
                                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0">
                                        <PlayCircle className="h-3 w-3 mr-1" />
                                        В процес
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-border/60">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Незапочнато
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="start" 
                          side="bottom"
                          className="max-h-[80vh] overflow-y-auto"
                          style={{
                            width: 'var(--radix-dropdown-menu-trigger-width)',
                            minWidth: 'var(--radix-dropdown-menu-trigger-width)',
                          }}
                          onOpenAutoFocus={(e) => {
                            e.preventDefault();
                            loadTraineeProgress(realtor);
                          }}
                        >
                          <DropdownMenuLabel className="sticky top-0 bg-popover z-10 pb-2 border-b">
                            <div className="flex flex-col">
                              <span className="font-semibold">{realtor.user.fullName}</span>
                              <span className="text-xs text-muted-foreground font-normal">{realtor.user.email}</span>
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={realtorProgressMap[realtor.id] || 0} className="h-2 flex-1" />
                                <span className="text-xs font-medium">{realtorProgressMap[realtor.id] || 0}%</span>
                              </div>
                            </div>
                          </DropdownMenuLabel>
                          <div className="p-2 space-y-1">
                            {trainingStructure.map((section) => {
                              const isExpanded = expandedSections.has(section.id);
                              return (
                                <div key={section.id} className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md transition-colors"
                                  >
                                    <span>{section.title}</span>
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                  {isExpanded && (
                                    <div className="ml-4 space-y-1 border-l-2 border-border/50 pl-2">
                                      {section.subsections.map((subsection) => {
                                        const progressKey = `${section.id}-${subsection.id}`;
                                        const progress = traineeProgressData[realtor.id]?.[progressKey] || {};
                                        
                                        const lectureCompleted = progress.lecture_completed || false;
                                        const videoCompleted = progress.video_completed || false;
                                        const practicalCompleted = progress.practical_completed || false;
                                        const handoverCompleted = progress.handover_completed || false;
                                        const examCompleted = progress.exam_completed || false;

                                        return (
                                          <div key={subsection.id} className="space-y-1.5 py-1">
                                            <div className="text-xs font-semibold text-foreground/80">{subsection.title}</div>
                                            <div className="space-y-1">
                                              <button
                                                type="button"
                                                onClick={() => handleListToggleProgress(realtor, section.id, subsection.id, 'lecture')}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                                  lectureCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                                )}
                                              >
                                                <BookOpen className={cn("h-3 w-3", lectureCompleted && "text-green-600 dark:text-green-400")} />
                                                <span className="flex-1 text-left">Лекция</span>
                                                {lectureCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleListToggleProgress(realtor, section.id, subsection.id, 'video')}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                                  videoCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                                )}
                                              >
                                                <Video className={cn("h-3 w-3", videoCompleted && "text-green-600 dark:text-green-400")} />
                                                <span className="flex-1 text-left">Видео</span>
                                                {videoCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleListToggleProgress(realtor, section.id, subsection.id, 'practical')}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                                  practicalCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                                )}
                                              >
                                                <Briefcase className={cn("h-3 w-3", practicalCompleted && "text-green-600 dark:text-green-400")} />
                                                <span className="flex-1 text-left">Практика</span>
                                                {practicalCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleListToggleProgress(realtor, section.id, subsection.id, 'handover')}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                                  handoverCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                                )}
                                              >
                                                <Handshake className={cn("h-3 w-3", handoverCompleted && "text-green-600 dark:text-green-400")} />
                                                <span className="flex-1 text-left">Предаване</span>
                                                {handoverCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleListToggleProgress(realtor, section.id, subsection.id, 'exam')}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                                  examCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                                )}
                                              >
                                                <FileText className={cn("h-3 w-3", examCompleted && "text-green-600 dark:text-green-400")} />
                                                <span className="flex-1 text-left">Изпит</span>
                                                {examCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                ))}
              </div>
            )}
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
        onUpdate={() => {
          fetchUserInfo();
          if (team) {
            fetchRealtors(team.id);
          }
        }}
        teamId={team?.id}
      />
      </AppLayout>
  );
});

// Задай displayName за по-лесно дебъгване
TeamLeaderDashboard.displayName = 'TeamLeaderDashboard';

export default TeamLeaderDashboard;
