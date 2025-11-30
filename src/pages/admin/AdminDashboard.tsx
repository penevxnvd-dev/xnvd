import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
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
import { Settings, Users } from 'lucide-react';
import { LogOut, ChevronLeft, Home, Plus, Pencil, Trash2, Calendar, Menu, User, ChevronDown } from 'lucide-react';
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
import { Office, TeamLeader, Agent } from '@/types';
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
} from '@/utils/kpiCalculations';

type ViewLevel = 'countries' | 'cities' | 'offices' | 'teams' | 'realtors';

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
  user: {
    fullName: string;
    email: string;
  };
}

interface AdminDashboardProps {
  userId: string;
}

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
  const [topologyOffices, setTopologyOffices] = useState<Office[]>([]);
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

  useEffect(() => {
    fetchCountries();
    fetchTopologyData();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { user } = await supabaseApi.getCurrentUser();
      if (user) {
        setUserInfo({
          fullName: user.fullName,
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
      const dbOffices = await supabaseApi.getAllOfficesFull();
      const transformedOffices = transformOffices(dbOffices);
      setTopologyOffices(transformedOffices);
    } catch (error) {
      console.error('Error fetching topology data:', error);
    }
  };

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const data = await supabaseApi.getCountries();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async (countryId: string) => {
    setLoading(true);
    try {
      const data = await supabaseApi.getCitiesByCountry(countryId);
      setCities(data.map((city: any) => ({
        id: city.id,
        name: city.name,
        country_id: city.countryId
      })));
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffices = async (cityId: string) => {
    setLoading(true);
    try {
      const data = await supabaseApi.getOfficesByCity(cityId);
      setOffices(data.map((office: any) => ({
        id: office.id,
        name: office.name,
        city_id: office.cityId,
        address: office.address
      })));
    } catch (error) {
      console.error('Error fetching offices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async (officeId: string) => {
    setLoading(true);
    try {
      const data = await supabaseApi.getTeamsByOffice(officeId);
      setTeams(data.map((team: any) => ({
        id: team.id,
        name: team.name,
        office_id: team.officeId,
        leader_id: team.leaderId
      })));
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtors = async (teamId: string) => {
    setLoading(true);
    try {
      const data = await supabaseApi.getRealtorsByTeam(teamId);
      setRealtors(data.map((realtor: any) => ({
        id: realtor.id,
        userId: realtor.userId,
        teamId: realtor.teamId,
        level: realtor.level,
        user: {
          fullName: realtor.user?.fullName || realtor.profile?.fullName || 'Неизвестен',
          email: realtor.user?.email || realtor.profile?.email || ''
        }
      })));
      
      // Изчисляване на KPI за екипа
      try {
        const kpi = await supabaseApi.getTeamKPI(teamId);
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

  const fetchCountryKPI = async (countryId: string) => {
    try {
      const kpi = await supabaseApi.getCountryKPI(countryId);
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
      const kpi = await supabaseApi.getCityKPI(cityId);
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
      const kpi = await supabaseApi.getOfficeKPI(officeId);
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
    await supabaseApi.logout();
    navigate('/auth');
  };

  const getBreadcrumb = () => {
    const parts = ['Начало'];
    if (selectedCountry) parts.push(selectedCountry.name);
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedOffice) parts.push(selectedOffice.name);
    if (selectedTeam) parts.push(selectedTeam.name);
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

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: any) => {
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
        await supabaseApi.deleteCountry(selectedItem.id);
      } else if (currentView === 'cities') {
        await supabaseApi.deleteCity(selectedItem.id);
      } else if (currentView === 'offices') {
        await supabaseApi.deleteOffice(selectedItem.id);
      } else if (currentView === 'teams') {
        await supabaseApi.deleteTeam(selectedItem.id);
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
    } catch (error: any) {
      toast.error(error.message || 'Грешка при изтриване');
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

  const handleTopologyOfficeClick = async (office: Office) => {
    // Find the city and country for this office
    const dbOffices = await supabaseApi.getAllOfficesFull();
    const dbOffice = dbOffices.find((o: any) => o.id === office.id);
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
      const teams = await supabaseApi.getTeamsByOffice(office.id);
      const team = teams.find((t: any) => t.leaderId === leader.id);
      if (team) {
        setSelectedTeam({ id: team.id, name: team.name, office_id: office.id, leader_id: team.leaderId || null });
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
      const teams = await supabaseApi.getTeamsByOffice(office.id);
      for (const team of teams) {
        const realtors = await supabaseApi.getRealtorsByTeam(team.id);
        const realtor = realtors.find((r: any) => r.profile?.id === agent.id);
        if (realtor) {
          setSelectedTeam({ id: team.id, name: team.name, office_id: office.id, leader_id: team.leaderId || null });
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
              <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain flex-shrink-0" />
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
              {currentView !== 'countries' && (
                <>
                  <Button onClick={handleHome} variant="outline" size="sm" className="text-xs sm:text-sm">
                    <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Начало</span>
                  </Button>
                  <Button onClick={handleBack} variant="outline" size="sm" className="text-xs sm:text-sm">
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Назад</span>
                  </Button>
                </>
              )}
              {currentView !== 'realtors' && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {currentView === 'countries' && countries.map((country) => (
              <div key={country.id} className="relative group">
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
                  </div>
            ))}

            {currentView === 'cities' && cities.map((city) => (
              <div key={city.id} className="relative group">
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
                  </div>
            ))}

            {currentView === 'offices' && offices.map((office) => (
              <div key={office.id} className="relative group">
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
                  </div>
            ))}

            {currentView === 'teams' && teams.map((team) => (
              <div key={team.id} className="relative group">
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
                  </div>
            ))}

            {currentView === 'realtors' && realtors.map((realtor) => (
              realtor.user && (
                <RealizatorCardWithKPI
                  key={realtor.id}
                  realtor={{
                    id: realtor.id,
                    name: realtor.user.fullName,
                    email: realtor.user.email,
                    level: realtor.level,
                    confidence: false,
                    salesResilience: false,
                    successMindset: false
                  }}
                  onClick={() => navigate('/training')}
                />
              )
            ))}
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