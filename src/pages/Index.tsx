import { useState, useEffect } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { OfficeCard } from '@/components/OfficeCard';
import { TeamLeaderCard } from '@/components/TeamLeaderCard';
import { AgentCard } from '@/components/AgentCard';
import { AgentDetailDialog } from '@/components/AgentDetailDialog';
import { TrainingCalendar } from '@/components/TrainingCalendar';
import { TrainingGroupDetail } from '@/components/TrainingGroupDetail';
import { mockTrainingGroups } from '@/data/trainingData';
import { transformOffices } from '@/utils/dataTransform';
import { Office, TeamLeader, Agent, TrainingGroup } from '@/types';
import { ChevronLeft, Home, BarChart3, GraduationCap, Calendar, LogOut } from 'lucide-react';
import logo from '@/assets/logo.jpeg';

type ViewType = 'offices' | 'leaders' | 'agents' | 'training';

const Index = () => {
  const navigate = useRouterNavigate();
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);
  
  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
    } else {
      api.getCurrentUser()
        .then(async () => {
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
          localStorage.removeItem('token');
          navigate('/auth');
        });
    }
  }, [navigate]);
  const [currentView, setCurrentView] = useState<ViewType>('offices');
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<TeamLeader | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedTrainingGroup, setSelectedTrainingGroup] = useState<TrainingGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
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

  const handleLogout = () => {
    api.logout();
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
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="HRCO Logo" className="h-16 w-16 object-contain" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setCurrentView('training')} variant={currentView === 'training' ? 'default' : 'outline'} size="sm">
                <GraduationCap className="h-4 w-4 mr-2" />
                Обучения
              </Button>
              <Button onClick={() => navigate('/training-calendar')} variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Календар
              </Button>
              <Button onClick={() => navigate('/interviews')} variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Интервюта
              </Button>
              <Button onClick={() => navigate('/analytics')} variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Аналитика
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Изход
              </Button>
              {currentView !== 'offices' && <>
                  <Button onClick={handleHome} variant="outline" size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    Начало
                  </Button>
                  <Button onClick={handleBack} variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                </>}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'training' && <TrainingCalendar groups={mockTrainingGroups} onGroupClick={handleTrainingGroupClick} />}

        {currentView === 'offices' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offices.length === 0 && !loading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                Няма налични офиси
              </div>
            ) : (
              offices.map(office => <OfficeCard key={office.id} office={office} onClick={() => handleOfficeClick(office)} />)
            )}
          </div>}

        {currentView === 'leaders' && selectedOffice && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedOffice.teamLeaders.map(leader => <TeamLeaderCard key={leader.id} leader={leader} onClick={() => handleLeaderClick(leader)} />)}
          </div>}

        {currentView === 'agents' && selectedLeader && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>;
};
export default Index;