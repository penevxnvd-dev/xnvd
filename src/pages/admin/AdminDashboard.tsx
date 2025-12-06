import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
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
import { UserManagementDialog } from '@/components/UserManagementDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Settings, Users, Download } from 'lucide-react';
import { LogOut, ChevronLeft, Home, Plus, Pencil, Trash2, Calendar, Menu, User, ChevronDown, FileText, Target, CheckCircle2, XCircle, Award, TrendingUp } from 'lucide-react';
import { exportKPIData, exportDeals, exportDiagnoses } from '@/lib/export';
import logo from '@/assets/logo.jpeg';
import { CreateEditDialog } from '@/components/admin/CreateEditDialog';
import { AddPersonToTeamDialog } from '@/components/admin/AddPersonToTeamDialog';
import { CountryCardWithKPI } from '@/components/cards/CountryCardWithKPI';
import { CityCardWithKPI } from '@/components/cards/CityCardWithKPI';
import { OfficeCardWithKPI } from '@/components/cards/OfficeCardWithKPI';
import { TeamCardWithKPI } from '@/components/cards/TeamCardWithKPI';
import { RealizatorCardWithKPI } from '@/components/cards/RealizatorCardWithKPI';
import { TopologySidebar } from '@/components/TopologySidebar';
import { transformOffices } from '@/utils/dataTransform';
import { Office as UIOffice, TeamLeader, Agent } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  calculateTeamKPI,
  calculateOfficeKPI,
  calculateCityKPI,
  calculateCountryKPI,
  RealtorData,
  KPIMetrics,
  formatSuccessRate,
} from '@/utils/kpiCalculations';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';

type ViewLevel = 'countries' | 'cities' | 'offices' | 'teams' | 'realtors' | 'realtor-detail';

interface Country {
  id: string;
  name: string;
  code: string;
}

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
  confidence?: boolean;
  salesResilience?: boolean;
  successMindset?: boolean;
  user: {
    fullName: string;
    email: string;
  };
}

interface AdminDashboardProps {
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

const AdminDashboard = ({ userId }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewLevel>('countries');
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedRealtor, setSelectedRealtor] = useState<Realtor | null>(null);
  const [selectedRealtorKPI, setSelectedRealtorKPI] = useState<KPIMetrics | null>(null);
  const [selectedRealtorDeals, setSelectedRealtorDeals] = useState<any[]>([]);
  const [selectedRealtorDiagnoses, setSelectedRealtorDiagnoses] = useState<any[]>([]);
  const [selectedRealtorTrainingData, setSelectedRealtorTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [selectedRealtorTrainingProgress, setSelectedRealtorTrainingProgress] = useState(0);
  const [topologyOffices, setTopologyOffices] = useState<UIOffice[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [showKPI, setShowKPI] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addPersonDialogOpen, setAddPersonDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [parentOptions, setParentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCountries();
    fetchTopologyData();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { user } = await api.getCurrentUser();
      if (user) {
        setUserInfo({
          fullName: user.full_name || user.email,
          email: user.email,
          role: 'Администратор'
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchTopologyData = async () => {
    try {
      const dbOffices = await api.getAllOfficesFull();
      const transformedOffices = transformOffices(dbOffices);
      setTopologyOffices(transformedOffices);
    } catch (error) {
      console.error('Error fetching topology data:', error);
    }
  };

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const data = await api.getCountries();
      const ordered = applyPositions(data, 'countries');
      setCountries(ordered);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async (countryId: string) => {
    setLoading(true);
    try {
      const data = await api.getCitiesByCountry(countryId);
      const mapped = data.map((city: { id: string; name: string; countryId: string }) => ({
        id: city.id,
        name: city.name,
        country_id: city.countryId
      }));
      const ordered = applyPositions(mapped, 'cities', countryId);
      setCities(ordered);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

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
      const ordered = applyPositions(mapped, 'offices', cityId);
      setOffices(ordered);
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
      const mapped = data.map((team: { id: string; name: string; officeId: string; leaderId?: string | null; leader?: { full_name?: string } }) => ({
        id: team.id,
        name: team.name,
        office_id: team.officeId,
        leader_id: team.leaderId,
        leaderName: team.leader?.full_name ? formatNameWithoutElevenEleven(team.leader.full_name).displayName : undefined
      }));
      const ordered = applyPositions(mapped, 'teams', officeId);
      setTeams(ordered);
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
          fullName: realtor.user?.fullName || realtor.profile?.full_name || 'Неизвестен',
          email: realtor.user?.email || realtor.profile?.email || ''
        }
      }));
      const ordered = applyPositions(mapped, 'realtors', teamId);
      setRealtors(ordered);
      
      // Изчисляване на KPI за екипа
      try {
        const kpi = await api.getTeamKPI(teamId);
        setKpiMetrics(kpi);
        setShowKPI(true);
      } catch (error) {
        console.error('Error fetching team KPI:', error);
        setShowKPI(false);
      }

    } catch (error) {
      console.error('Error fetching realtors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Helper functions to save/load positions from localStorage
  const getStorageKey = (view: ViewLevel, contextId?: string) => {
    if (view === 'cities') {
      const countryId = contextId || selectedCountry?.id;
      return countryId ? `card-positions-cities-${countryId}` : `card-positions-cities`;
    } else if (view === 'offices') {
      const cityId = contextId || selectedCity?.id;
      return cityId ? `card-positions-offices-${cityId}` : `card-positions-offices`;
    } else if (view === 'teams') {
      const officeId = contextId || selectedOffice?.id;
      return officeId ? `card-positions-teams-${officeId}` : `card-positions-teams`;
    } else if (view === 'realtors') {
      const teamId = contextId || selectedTeam?.id;
      return teamId ? `card-positions-realtors-${teamId}` : `card-positions-realtors`;
    }
    return `card-positions-${view}`;
  };

  const savePositions = (view: ViewLevel, itemIds: string[], contextId?: string) => {
    const key = getStorageKey(view, contextId);
    try {
      localStorage.setItem(key, JSON.stringify(itemIds));
    } catch (error) {
      console.error('Error saving positions to localStorage:', error);
    }
  };

  const loadPositions = (view: ViewLevel, contextId?: string): string[] | null => {
    const key = getStorageKey(view, contextId);
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading positions from localStorage:', error);
      return null;
    }
  };

  const applyPositions = <T extends { id: string }>(items: T[], view: ViewLevel, contextId?: string): T[] => {
    const savedPositions = loadPositions(view, contextId);
    if (!savedPositions || savedPositions.length === 0) {
      return items;
    }

    // Create a map for quick lookup
    const itemsMap = new Map(items.map(item => [item.id, item]));
    
    // Reorder based on saved positions, keeping items not in saved list at the end
    const ordered: T[] = [];
    const usedIds = new Set<string>();
    
    savedPositions.forEach(id => {
      if (itemsMap.has(id)) {
        ordered.push(itemsMap.get(id)!);
        usedIds.add(id);
      }
    });
    
    // Add any items that weren't in the saved positions
    items.forEach(item => {
      if (!usedIds.has(item.id)) {
        ordered.push(item);
      }
    });
    
    return ordered;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    if (currentView === 'countries') {
      setCountries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        savePositions('countries', reordered.map(item => item.id));
        return reordered;
      });
    } else if (currentView === 'cities') {
      setCities((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        savePositions('cities', reordered.map(item => item.id), selectedCountry?.id);
        return reordered;
      });
    } else if (currentView === 'offices') {
      setOffices((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        savePositions('offices', reordered.map(item => item.id), selectedCity?.id);
        return reordered;
      });
    } else if (currentView === 'teams') {
      setTeams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        savePositions('teams', reordered.map(item => item.id), selectedOffice?.id);
        return reordered;
      });
    } else if (currentView === 'realtors') {
      setRealtors((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        savePositions('realtors', reordered.map(item => item.id), selectedTeam?.id);
        return reordered;
      });
    }
  };

  const fetchCountryKPI = async (countryId: string) => {
    try {
      const kpi = await api.getCountryKPI(countryId);
      setKpiMetrics(kpi);
      setShowKPI(true);
    } catch (error) {
      console.error('Error fetching country KPI:', error);
      setShowKPI(false);
    }
  };

  const handleCountryClick = (country: Country) => {
    setSelectedCountry(country);
    setCurrentView('cities');
    fetchCities(country.id);
    fetchCountryKPI(country.id);
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
      setSelectedRealtorKPI(null);
      setSelectedRealtorDeals([]);
      setSelectedRealtorDiagnoses([]);
      return;
    }
    if (currentView === 'realtors') {
      setCurrentView('teams');
      setSelectedTeam(null);
      fetchTeams(selectedOffice!.id);
      fetchOfficeKPI(selectedOffice!.id);
    } else if (currentView === 'teams') {
      setCurrentView('offices');
      setSelectedOffice(null);
      fetchOffices(selectedCity!.id);
      fetchCityKPI(selectedCity!.id);
    } else if (currentView === 'offices') {
      setCurrentView('cities');
      setSelectedCity(null);
      fetchCities(selectedCountry!.id);
      fetchCountryKPI(selectedCountry!.id);
    } else if (currentView === 'cities') {
      setCurrentView('countries');
      setSelectedCountry(null);
      fetchCountries();
      setShowKPI(false);
    }
  };

  const handleHome = () => {
    setCurrentView('countries');
    setSelectedCountry(null);
    setSelectedCity(null);
    setSelectedOffice(null);
    setSelectedTeam(null);
    setShowKPI(false);
    fetchCountries();
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (currentView === 'realtor-detail' && selectedRealtor) {
      parts.push(selectedRealtor.user.fullName);
    } else {
    if (selectedCountry) parts.push(selectedCountry.name);
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedOffice) parts.push(selectedOffice.name);
    if (selectedTeam) parts.push(selectedTeam.name);
    }
    return parts.join(' / ');
  };

  const handleCreate = () => {
    if (currentView === 'countries') {
      setParentOptions([]);
      setCreateDialogOpen(true);
    } else if (currentView === 'cities' && selectedCountry) {
      setParentOptions([{ id: selectedCountry.id, name: selectedCountry.name }]);
      setCreateDialogOpen(true);
    } else if (currentView === 'offices' && selectedCity) {
      setParentOptions([{ id: selectedCity.id, name: selectedCity.name }]);
      setCreateDialogOpen(true);
    } else if (currentView === 'teams' && selectedOffice) {
      setParentOptions([{ id: selectedOffice.id, name: selectedOffice.name }]);
      setCreateDialogOpen(true);
    }
  };

  const handleEdit = (item: { id: string; name: string; [key: string]: unknown }) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: { id: string; name: string; [key: string]: unknown }) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    const tableName =
      currentView === 'countries'
        ? 'countries'
        : currentView === 'cities'
        ? 'cities'
        : currentView === 'offices'
        ? 'offices'
        : currentView === 'teams'
        ? 'teams'
        : '';

    if (!tableName) return;

    try {
      if (currentView === 'countries') {
        await api.deleteCountry(selectedItem.id);
      } else if (currentView === 'cities') {
        await api.deleteCity(selectedItem.id);
      } else if (currentView === 'offices') {
        await api.deleteOffice(selectedItem.id);
      } else if (currentView === 'teams') {
        await api.deleteTeam(selectedItem.id);
      }

      toast.success('Успешно изтрито');
      setDeleteDialogOpen(false);
      setSelectedItem(null);

      // Обновяване на списъка
      if (currentView === 'countries') {
        fetchCountries();
      } else if (currentView === 'cities' && selectedCountry) {
        fetchCities(selectedCountry.id);
      } else if (currentView === 'offices' && selectedCity) {
        fetchOffices(selectedCity.id);
      } else if (currentView === 'teams' && selectedOffice) {
        fetchTeams(selectedOffice.id);
      } else if (currentView === 'realtors' && selectedTeam) {
        fetchRealtors(selectedTeam.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message || 'Грешка при изтриване');
    }
  };

  const getCurrentType = (): 'country' | 'city' | 'office' | 'team' => {
    if (currentView === 'countries') return 'country';
    if (currentView === 'cities') return 'city';
    if (currentView === 'offices') return 'office';
    return 'team';
  };

  const handleDialogSuccess = () => {
    if (currentView === 'countries') {
      fetchCountries();
    } else if (currentView === 'cities' && selectedCountry) {
      fetchCities(selectedCountry.id);
    } else if (currentView === 'offices' && selectedCity) {
      fetchOffices(selectedCity.id);
    } else if (currentView === 'teams' && selectedOffice) {
      fetchTeams(selectedOffice.id);
    } else if (currentView === 'realtors' && selectedTeam) {
      fetchRealtors(selectedTeam.id);
    }
  };

  const handleTopologyOfficeClick = async (office: UIOffice) => {
    // Find the city and country for this office
    const dbOffices = await api.getAllOfficesFull();
    const dbOffice = dbOffices.find((o: { id: string; city?: { id: string; name: string; country?: { id: string; name: string; code?: string } }; address?: string | null }) => o.id === office.id);
    if (dbOffice?.city) {
      const city = dbOffice.city;
      const country = city.country;
      if (country) {
        setSelectedCountry({ id: country.id, name: country.name, code: country.code || '' });
        fetchCities(country.id);
      }
      if (city) {
        setSelectedCity({ id: city.id, name: city.name, country_id: country.id });
        fetchOffices(city.id);
      }
      setSelectedOffice({ id: office.id, name: office.name, city_id: city.id, address: dbOffice.address || null });
      fetchTeams(office.id);
      setCurrentView('teams');
    }
  };

  const handleTopologyLeaderClick = async (leader: TeamLeader) => {
    // Find the team for this leader
    const office = topologyOffices.find((o) => o.teamLeaders.some((l) => l.id === leader.id));
    if (office) {
      await handleTopologyOfficeClick(office);
      // Find and select the team
      const teams = await api.getTeamsByOffice(office.id);
      const team = teams.find((t: { leader_id?: string | null }) => t.leader_id === leader.id);
      if (team) {
        setSelectedTeam({ id: team.id, name: team.name, office_id: office.id, leader_id: team.leader_id || null });
        fetchRealtors(team.id);
        setCurrentView('realtors');
      }
    }
  };

  const handleTopologyAgentClick = async (agent: Agent) => {
    // Find the team for this agent
    const office = topologyOffices.find((o) => 
      o.teamLeaders.some((l) => l.teamMembers.some((a) => a.id === agent.id))
    );
    if (office) {
      handleTopologyOfficeClick(office);
      // Find and select the team and realtor
      const teams = await api.getTeamsByOffice(office.id);
      for (const team of teams) {
        const realtors = await api.getRealtorsByTeam(team.id);
        const realtor = realtors.find((r: { profile?: { id?: string } }) => r.profile?.id === agent.id);
        if (realtor) {
          setSelectedTeam({ id: team.id, name: team.name, office_id: office.id, leader_id: team.leader_id || null });
          fetchRealtors(team.id);
          setCurrentView('realtors');
          break;
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Topology Sidebar */}
      <TopologySidebar
        offices={topologyOffices}
        onOfficeClick={handleTopologyOfficeClick}
        onLeaderClick={handleTopologyLeaderClick}
        onAgentClick={handleTopologyAgentClick}
        selectedOfficeId={selectedOffice?.id}
        selectedLeaderId={selectedTeam?.leader_id || undefined}
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
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">Админ Панел</h1>
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
              {currentView !== 'countries' && (
                <>
                  <Button onClick={handleBack} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span>Назад</span>
                  </Button>
                </>
              )}
              {currentView !== 'realtors' && currentView !== 'realtor-detail' && (
                <Button onClick={handleCreate} variant="default" size="sm" className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Добави</span>
                </Button>
              )}
              {currentView === 'realtors' && selectedTeam && (
                <Button onClick={() => setAddPersonDialogOpen(true)} variant="default" size="sm" className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Добави човек</span>
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
                  <DropdownMenuItem disabled>
                    <FileText className="h-4 w-4 mr-2" />
                    Експорт на всички данни (скоро)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationCenter />
              <ThemeToggle />
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
                  <DropdownMenuItem onClick={() => setUserManagementOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Управление на акаунти
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
                currentView === 'countries' ? countries.map(c => c.id) :
                currentView === 'cities' ? cities.map(c => c.id) :
                currentView === 'offices' ? offices.map(o => o.id) :
                currentView === 'teams' ? teams.map(t => t.id) :
                currentView === 'realtors' ? realtors.map(r => r.id) : []
              }
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {currentView === 'countries' && countries.map((country) => (
                  <SortableCard key={country.id} id={country.id}>
                <CountryCardWithKPI
                  country={country}
                      onClick={() => handleCountryClick(country)}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(country);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(country);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </SortableCard>
            ))}

            {currentView === 'cities' && cities.map((city) => (
              <SortableCard key={city.id} id={city.id}>
                <CityCardWithKPI
                  city={{ ...city, countryName: selectedCountry?.name }}
                      onClick={() => handleCityClick(city)}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(city);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(city);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </SortableCard>
            ))}

            {currentView === 'offices' && offices.map((office) => (
              <SortableCard key={office.id} id={office.id}>
                <OfficeCardWithKPI
                  office={office}
                  onClick={() => handleOfficeClick(office)}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(office);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(office);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </SortableCard>
            ))}

            {currentView === 'teams' && teams.map((team) => (
              <SortableCard key={team.id} id={team.id}>
                <TeamCardWithKPI
                  team={team}
                  onClick={() => handleTeamClick(team)}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(team);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
                  onClick={async () => {
                    // Fetch full realtor data with all fields
                    try {
                      // Get realtor details - using API
                      // TODO: Add API endpoint for full realtor details with all fields
                      setSelectedRealtor({
                        ...realtor,
                        confidence: false,
                        salesResilience: false,
                        successMindset: false,
                      });
                      
                      const kpi = await api.getRealtorKPI(realtor.id);
                      setSelectedRealtorKPI(kpi);
                      
                      // Fetch deals and diagnoses
                      // TODO: Add API endpoints for realtor deals and diagnoses
                      const deals: Array<Record<string, unknown>> = [];
                      const diagnoses: Array<Record<string, unknown>> = [];
                      
                      setSelectedRealtorDeals(deals);
                      setSelectedRealtorDiagnoses(diagnoses);
                      
                      // Fetch training progress
                      // TODO: Add API endpoint for training progress
                      const trainingProgress: Array<{ section: string; subsection: string }> = [];
                      
                      if (trainingProgress && trainingProgress.length > 0) {
                        const updatedTrainingData = trainingStructure.map((section) => ({
                          ...section,
                          subsections: section.subsections.map((subsection) => {
                            const progressItem = trainingProgress.find(
                              (p: { section: string; subsection: string }) => p.section === section.id && p.subsection === subsection.id
                            );
                            return {
                              ...subsection,
                              progress: progressItem
                                ? {
                                    lecture: progressItem.lecture_completed || false,
                                    video: progressItem.video_completed || false,
                                    practical: progressItem.practical_completed || false,
                                    handover: progressItem.handover_completed || false,
                                    exam: progressItem.exam_completed || false,
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
                        key={deal.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{deal.client_name}</p>
                          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                            {new Date(deal.deal_date).toLocaleDateString('bg-BG')}
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
                        key={diagnosis.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{diagnosis.client_name}</p>
                          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                            {new Date(diagnosis.diagnosis_date).toLocaleDateString('bg-BG')}
                          </p>
                        </div>
                        <Badge className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0">{diagnosis.status}</Badge>
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
                  onProgressUpdate={() => {}} // Read-only in detail view
                  editable={false}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && currentView === 'countries' && countries.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Все още няма добавени държави. Започнете като добавите първата държава.
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create Dialog */}
      <CreateEditDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type={getCurrentType()}
        parentOptions={parentOptions}
        onSuccess={handleDialogSuccess}
      />

      {/* Edit Dialog */}
      <CreateEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        type={getCurrentType()}
        editData={selectedItem}
        parentOptions={parentOptions}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Потвърждение за изтриване</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете "{selectedItem?.name}"? Това действие не може да бъде отменено.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отказ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Изтрий
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Person to Team Dialog */}
      {selectedTeam && (
        <AddPersonToTeamDialog
          open={addPersonDialogOpen}
          onOpenChange={setAddPersonDialogOpen}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Account Settings Dialog */}
      {userInfo && (
        <AccountSettingsDialog
          open={accountSettingsOpen}
          onOpenChange={setAccountSettingsOpen}
          userInfo={userInfo}
          onUpdate={fetchUserInfo}
        />
      )}

      {/* User Management Dialog */}
      <UserManagementDialog
        open={userManagementOpen}
        onOpenChange={setUserManagementOpen}
        onUpdate={fetchUserInfo}
      />
      </div>
    </div>
  );
};

export default AdminDashboard;