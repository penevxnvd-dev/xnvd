import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronLeft } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { TrainingCalendar } from '@/components/TrainingCalendar';
import { TrainingGroup } from '@/types';
import { TrainingGroupDetail } from '@/components/TrainingGroupDetail';
import { useUserRole } from '@/hooks/useUserRole';
import { api } from '@/lib/api';
import { supabaseApi } from '@/lib/supabaseApi';

const TrainingCalendarPage = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroup[]>([]);
  const [loadingTrainingGroups, setLoadingTrainingGroups] = useState(true);
  const [selectedTrainingGroup, setSelectedTrainingGroup] = useState<TrainingGroup | null>(null);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);

  // Fetch current user ID and name
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { user } = await supabaseApi.getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
          // Get full name from profile
          const { data: profile } = await supabaseApi.supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (profile?.full_name) {
            setCurrentUserName(profile.full_name);
          } else {
            // Fallback to email if no profile name
            setCurrentUserName(user.email?.split('@')[0] || undefined);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch training groups from database
  useEffect(() => {
    const fetchTrainingGroups = async () => {
      setLoadingTrainingGroups(true);
      try {
        const groups = await api.getAllTrainingGroups();
        // Transform to match TrainingGroup interface
        const transformedGroups: TrainingGroup[] = groups.map((g) => ({
          id: g.id,
          startDate: g.startDate,
          leader: g.leader,
          leaderId: g.leaderId,
          trainees: g.trainees.map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            email: t.email,
            position: t.position,
            level: t.level,
            trainingStage: t.trainingStage,
            selectedDate: '',
            introCompleted: t.introCompleted || false,
          })),
          currentDay: g.currentDay,
          status: g.status,
          createdBy: g.createdBy || null,
        }));
        setTrainingGroups(transformedGroups);
      } catch (error) {
        console.error('Error fetching training groups:', error);
        setTrainingGroups([]);
      } finally {
        setLoadingTrainingGroups(false);
      }
    };

    fetchTrainingGroups();
  }, []);

  const handleUpdateTrainingGroups = async (updatedGroups: TrainingGroup[]) => {
    // Update local state immediately for better UX
    setTrainingGroups(updatedGroups);
    
    // Refresh from database to ensure consistency after a short delay
    setTimeout(async () => {
      try {
        const groups = await api.getAllTrainingGroups();
        const transformedGroups: TrainingGroup[] = groups.map((g) => ({
          id: g.id,
          startDate: g.startDate,
          leader: g.leader,
          leaderId: g.leaderId,
          trainees: g.trainees.map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            email: t.email,
            position: t.position,
            level: t.level,
            trainingStage: t.trainingStage,
            selectedDate: '',
            introCompleted: t.introCompleted || false,
          })),
          currentDay: g.currentDay,
          status: g.status,
          createdBy: g.createdBy || null,
        }));
        setTrainingGroups(transformedGroups);
      } catch (error) {
        console.error('Error refreshing training groups:', error);
      }
    }, 500);
  };

  const handleTrainingGroupClick = (group: TrainingGroup) => {
    setSelectedTrainingGroup(group);
    setTrainingDialogOpen(true);
  };

  const handleLogout = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </Button>
              <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Календар на обученията</h1>
                <p className="text-xs text-muted-foreground">График на новите групи</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Изход
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loadingTrainingGroups ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Зареждане на групи...</p>
            </div>
          </div>
        ) : (
          <TrainingCalendar 
            groups={trainingGroups} 
            onGroupClick={handleTrainingGroupClick}
            onUpdateGroups={handleUpdateTrainingGroups}
            canEdit={role !== 'realtor' && role !== null}
            currentUserId={currentUserId || undefined}
            currentUserName={currentUserName}
            currentUserRole={role || undefined}
            selectedCityId={null}
          />
        )}
      </main>

      <TrainingGroupDetail 
        group={selectedTrainingGroup} 
        open={trainingDialogOpen} 
        onOpenChange={setTrainingDialogOpen} 
      />
    </div>
  );
};

export default TrainingCalendarPage;

