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
// Avatar removed - using modern design with initials badges instead
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Settings, Users, Download, BarChart3, Menu, ChevronDown, ChevronLeft, Home, Calendar, CheckCircle2, FileText, Target, XCircle, Award, TrendingUp } from 'lucide-react';
import { exportKPIData, exportDeals, exportDiagnoses } from '@/lib/export';
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
import { TrainingManagementDialog } from '@/components/TrainingManagementDialog';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { LogOut, GraduationCap } from 'lucide-react';

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
  const [selectedRealtorKPI, setSelectedRealtorKPI] = useState<KPIMetrics | null>(null);
  const [selectedRealtorDeals, setSelectedRealtorDeals] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRealtorDiagnoses, setSelectedRealtorDiagnoses] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRealtorTrainingData, setSelectedRealtorTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [selectedRealtorTrainingProgress, setSelectedRealtorTrainingProgress] = useState(0);
  const [topologyOffices, setTopologyOffices] = useState<UIOffice[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      // Мапване на данните - Supabase връща office_id, не officeId
      const mapped = data.map((team: { 
        id: string; 
        name: string; 
        office_id?: string; 
        leader_id?: string | null; 
        leader?: { full_name?: string } 
      }) => ({
        id: team.id,
        name: team.name,
        office_id: team.office_id || officeId,
        leader_id: team.leader_id || null,
        leaderName: team.leader?.full_name ? formatNameWithoutElevenEleven(team.leader.full_name).displayName : undefined
      }));
      // Дедупликация по ID (допълнителна защита)
      const seenIds = new Set<string>();
      const uniqueTeams = mapped.filter(team => {
        if (seenIds.has(team.id)) {
          console.warn(`[fetchTeams] Duplicate team ID in UI: ${team.id} (${team.name})`);
          return false;
        }
        seenIds.add(team.id);
        return true;
      });
      setTeams(uniqueTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]); // При грешка, изчистваме списъка
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

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedOffice) parts.push(selectedOffice.name);
    if (selectedTeam) parts.push(selectedTeam.name);
    if (currentView === 'realtor-detail' && selectedRealtor) {
      parts.push(selectedRealtor.user.fullName);
    }
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
      <header className="border-b border-border bg-card/95 backdrop-blur-lg shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Top row - Logo, Title, Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
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
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">Регионален мениджър</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{getBreadcrumb()}</p>
              </div>
              {/* Compact KPI Cards after title */}
              {showKPI && kpiMetrics && (
                <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4">
                  <div 
                    className="group cursor-pointer rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105"
                    title="Диагнози"
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300">{kpiMetrics.diagnoses || 0}</span>
                    </div>
                  </div>
                  
                  <div 
                    className="group cursor-pointer rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:from-green-500/20 hover:to-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105"
                    title="Сделки"
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-300">{kpiMetrics.deals || 0}</span>
                    </div>
                  </div>
                  
                  <div 
                    className="group cursor-pointer rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:from-purple-500/20 hover:to-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105"
                    title="Успеваемост"
                  >
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300">
                        {formatSuccessRate(kpiMetrics.successRate || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
                  {selectedRealtorKPI && (
                    <>
                      <DropdownMenuItem onClick={() => {
                        exportKPIData(selectedRealtorKPI, `kpi-realtor-${selectedRealtor?.user.fullName}-${new Date().toISOString().split('T')[0]}`);
                        toast.success('KPI данните са експортирани');
                      }}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        KPI данни (Реализатор)
                      </DropdownMenuItem>
                      {selectedRealtorDeals.length > 0 && (
                        <DropdownMenuItem onClick={() => {
                          exportDeals(selectedRealtorDeals, `deals-${selectedRealtor?.user.fullName}-${new Date().toISOString().split('T')[0]}`);
                          toast.success('Сделките са експортирани');
                        }}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Сделки (Реализатор)
                        </DropdownMenuItem>
                      )}
                      {selectedRealtorDiagnoses.length > 0 && (
                        <DropdownMenuItem onClick={() => {
                          exportDiagnoses(selectedRealtorDiagnoses, `diagnoses-${selectedRealtor?.user.fullName}-${new Date().toISOString().split('T')[0]}`);
                          toast.success('Диагнозите са експортирани');
                        }}>
                          <Users className="h-4 w-4 mr-2" />
                          Диагнози (Реализатор)
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {kpiMetrics && (
                    <DropdownMenuItem onClick={() => {
                      exportKPIData(kpiMetrics, `kpi-regional-${new Date().toISOString().split('T')[0]}`);
                      toast.success('KPI данните са експортирани');
                    }}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      KPI данни ({currentView === 'offices' ? 'Град' : currentView === 'teams' ? 'Офис' : 'Регион'})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <FileText className="h-4 w-4 mr-2" />
                    Експорт на всички данни (скоро)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-[10px] sm:text-xs border border-primary/30">
                        {userInfo?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </div>
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
                            onClick={async () => {
                              // Fetch full realtor data with all fields
                              try {
                                setSelectedRealtor({
                                  ...realtor,
                                  confidence: false,
                                  salesResilience: false,
                                  successMindset: false,
                                });
                                
                                const kpi = await api.getRealtorKPI(realtor.userId);
                                setSelectedRealtorKPI(kpi);
                                
                                // Fetch deals and diagnoses
                                const deals = await api.getRealtorDeals(realtor.id);
                                const diagnoses = await api.getRealtorDiagnoses(realtor.id);
                                
                                setSelectedRealtorDeals(deals as Array<Record<string, unknown>>);
                                setSelectedRealtorDiagnoses(diagnoses as Array<Record<string, unknown>>);
                                
                                // Fetch training progress
                                const trainingProgress = await api.getRealtorTrainingProgress(realtor.id);
                                
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
      </main>
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
    </div>
  );
};

export default RegionalManagerDashboard;
