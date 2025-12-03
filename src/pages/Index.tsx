import { useState, useEffect } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { api, supabaseApi } from '@/lib/api';
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
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { Settings } from 'lucide-react';
import { OfficeCard } from '@/components/OfficeCard';
import { TeamLeaderCard } from '@/components/TeamLeaderCard';
import { AgentCard } from '@/components/AgentCard';
import { AgentDetailDialog } from '@/components/AgentDetailDialog';
import { TrainingCalendar } from '@/components/TrainingCalendar';
import { TrainingGroupDetail } from '@/components/TrainingGroupDetail';
import { TopologySidebar } from '@/components/TopologySidebar';
import { mockTrainingGroups } from '@/data/trainingData';
import { transformOffices } from '@/utils/dataTransform';
import { Office, TeamLeader, Agent, TrainingGroup } from '@/types';
import { ChevronLeft, Home, BarChart3, GraduationCap, Calendar, LogOut, Menu, ChevronDown } from 'lucide-react';
import logo from '@/assets/logo.jpeg';

type ViewType = 'offices' | 'leaders' | 'agents' | 'training';

const Index = () => {
  const navigate = useRouterNavigate();
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);
  
  useEffect(() => {
    // Check authentication
    api.getCurrentUser()
      .then(async (userData) => {
        // Set user info
        if (userData.user) {
          // Fetch user roles
          const { data: roles } = await supabaseApi.supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user.id);
          
          const isAdmin = roles?.some(r => r.role === 'admin');
          
          setUserInfo({
            fullName: userData.user.full_name || userData.user.email,
            email: userData.user.email,
            role: isAdmin ? 'Администратор' : 'Реализатор'
          });
        }
        // Fetch offices with full structure
        try {
          const dbOffices = await api.getAllOfficesFull();
          const transformedOffices = transformOffices(dbOffices);
          setOffices(transformedOffices);
        } catch (error) {
          console.error('Error fetching offices:', error);
          // Fallback to empty array
          setOffices([]);
        }
        setLoading(false);
      })
      .catch(() => {
        navigate('/auth');
      });
  }, [navigate]);
  const [currentView, setCurrentView] = useState<ViewType>('offices');
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<TeamLeader | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedTrainingGroup, setSelectedTrainingGroup] = useState<TrainingGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; role: string} | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const handleOfficeClick = (office: Office) => {
    setSelectedOffice(office);
    setCurrentView('leaders');
  };
  const handleLeaderClick = (leader: TeamLeader) => {
    setSelectedLeader(leader);
    setCurrentView('agents');
  };
  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };
  const handleTrainingGroupClick = (group: TrainingGroup) => {
    setSelectedTrainingGroup(group);
    setTrainingDialogOpen(true);
  };
  const handleBack = () => {
    if (currentView === 'agents') {
      setCurrentView('leaders');
      setSelectedLeader(null);
    } else if (currentView === 'leaders') {
      setCurrentView('offices');
      setSelectedOffice(null);
    } else if (currentView === 'training') {
      setCurrentView('offices');
    }
  };
  const handleHome = () => {
    setCurrentView('offices');
    setSelectedOffice(null);
    setSelectedLeader(null);
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }
  const getBreadcrumb = () => {
    const parts = ['Всички офиси'];
    if (currentView === 'training') return 'Обучения';
    if (selectedOffice) parts.push(selectedOffice.name);
    if (selectedLeader) parts.push(selectedLeader.name);
    return parts.join(' / ');
  };
  return <div className="min-h-screen bg-background flex">
      {/* Topology Sidebar */}
      <TopologySidebar
        offices={offices}
        onOfficeClick={handleOfficeClick}
        onLeaderClick={handleLeaderClick}
        onAgentClick={handleAgentClick}
        selectedOfficeId={selectedOffice?.id}
        selectedLeaderId={selectedLeader?.id}
        selectedAgentId={selectedAgent?.id}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6">
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
                <img src={logo} alt="HRCO Logo" className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 object-contain flex-shrink-0" />
              </div>
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button onClick={() => setCurrentView('training')} variant={currentView === 'training' ? 'default' : 'outline'} size="sm" className="text-xs sm:text-sm">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Обучения</span>
                </Button>
                <Button onClick={() => navigate('/training-calendar')} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Календар</span>
                </Button>
                <Button onClick={() => navigate('/interviews')} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Интервюта</span>
                </Button>
                <Button onClick={() => navigate('/analytics')} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Аналитика</span>
                </Button>
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
                        <span className="hidden sm:inline">{userInfo?.fullName ? formatNameWithEmoji(userInfo.fullName) : 'Акаунт'}</span>
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userInfo?.fullName ? formatNameWithEmoji(userInfo.fullName) : 'Потребител'}</p>
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
                {currentView !== 'offices' && <>
                    <Button onClick={handleHome} variant="outline" size="sm" className="text-xs sm:text-sm">
                      <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Начало</span>
                    </Button>
                    <Button onClick={handleBack} variant="outline" size="sm" className="text-xs sm:text-sm">
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Назад</span>
                    </Button>
                  </>}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 flex-1">
        {currentView === 'training' && <TrainingCalendar groups={mockTrainingGroups} onGroupClick={handleTrainingGroupClick} />}

        {currentView === 'offices' && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {offices.length === 0 && !loading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                Няма налични офиси
              </div>
            ) : (
              offices.map(office => <OfficeCard key={office.id} office={office} onClick={() => handleOfficeClick(office)} />)
            )}
          </div>}

        {currentView === 'leaders' && selectedOffice && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {selectedOffice.teamLeaders.map(leader => <TeamLeaderCard key={leader.id} leader={leader} onClick={() => handleLeaderClick(leader)} />)}
          </div>}

        {currentView === 'agents' && selectedLeader && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {selectedLeader.teamMembers.map(agent => <AgentCard key={agent.id} agent={agent} onClick={() => handleAgentClick(agent)} />)}
          </div>}
      </main>

      {/* Dialogs */}
      <AgentDetailDialog agent={selectedAgent} open={dialogOpen} onOpenChange={setDialogOpen} />
      <TrainingGroupDetail group={selectedTrainingGroup} open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen} />

        {/* Footer */}
        <footer className="border-t border-border bg-card mt-12">
          <div className="container mx-auto px-4 py-6">
            <p className="text-center text-sm text-muted-foreground">
              Разработено от Octa Investment Group
            </p>
          </div>
        </footer>
      </div>
    </div>;
};
export default Index;