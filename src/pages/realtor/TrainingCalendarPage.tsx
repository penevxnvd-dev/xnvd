import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronLeft } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { TrainingCalendar } from '@/components/TrainingCalendar';
import { mockTrainingGroups } from '@/data/trainingData';
import { TrainingGroup } from '@/types';
import { TrainingGroupDetail } from '@/components/TrainingGroupDetail';

const TrainingCalendarPage = () => {
  const navigate = useNavigate();
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroup[]>(mockTrainingGroups);
  const [selectedTrainingGroup, setSelectedTrainingGroup] = useState<TrainingGroup | null>(null);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);

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
        <TrainingCalendar 
          groups={trainingGroups} 
          onGroupClick={handleTrainingGroupClick}
          onUpdateGroups={setTrainingGroups}
        />
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

