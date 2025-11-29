import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LogOut, BookOpen } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { toast } from 'sonner';

interface TrainingProgress {
  section: string;
  subsection: string;
  lectureCompleted: boolean;
  videoCompleted: boolean;
  practicalCompleted: boolean;
  handoverCompleted: boolean;
  examCompleted: boolean;
}

const TrainingPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [realtorId, setRealtorId] = useState<string | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (realtorId) {
      fetchTrainingProgress();
    }
  }, [realtorId]);

  const fetchUserData = async () => {
    try {
      const { user } = await api.getCurrentUser();
      if (user) {
        setUserId(user.id);
        const realtor = await api.getCurrentRealtor();
        if (realtor) {
          setRealtorId(realtor.id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingProgress = async () => {
    if (!realtorId) return;

    try {
      const progressData = await api.getTrainingProgress();

      if (progressData) {
        // Обновяване на структурата с данни от базата
        const updatedData = trainingData.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => {
            const progressItem = progressData.find(
              (p: TrainingProgress) => p.section === section.id && p.subsection === subsection.id
            );
            return {
              ...subsection,
              progress: progressItem
                ? {
                    lecture: progressItem.lectureCompleted,
                    video: progressItem.videoCompleted,
                    practical: progressItem.practicalCompleted,
                    handover: progressItem.handoverCompleted,
                    exam: progressItem.examCompleted,
                  }
                : subsection.progress,
            };
          }),
        }));

        setTrainingData(updatedData);
        setProgress(calculateTrainingProgress(updatedData));
      }
    } catch (error) {
      console.error('Error fetching training progress:', error);
    }
  };

  const handleProgressUpdate = async (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => {
    if (!realtorId) return;

    // Обновяване на локалното състояние
    const updatedData = trainingData.map((section) => {
      if (section.id === sectionId) {
        return {
          ...section,
          subsections: section.subsections.map((subsection) => {
            if (subsection.id === subsectionId) {
              return {
                ...subsection,
                progress: {
                  ...subsection.progress,
                  [field]: checked,
                },
              };
            }
            return subsection;
          }),
        };
      }
      return section;
    });

    setTrainingData(updatedData);
    setProgress(calculateTrainingProgress(updatedData));

    // Запазване в базата данни
    try {
      const subsection = updatedData
        .find((s) => s.id === sectionId)
        ?.subsections.find((ss) => ss.id === subsectionId);

      if (subsection) {
        await api.updateTrainingProgress({
          section: sectionId,
          subsection: subsectionId,
          lectureCompleted: subsection.progress.lecture,
          videoCompleted: subsection.progress.video,
          practicalCompleted: subsection.progress.practical,
          handoverCompleted: subsection.progress.handover,
          examCompleted: subsection.progress.exam,
        });

        toast.success('Прогресът е обновен');
      }
    } catch (error: any) {
      toast.error('Грешка при запазване на прогреса');
      console.error(error);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Обучение</h1>
                <p className="text-xs text-muted-foreground">Проследяване на обучителен прогрес</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/')} variant="outline" size="sm">
                Начало
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Изход
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Прогрес бар */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Общ прогрес на обучението
              </CardTitle>
              <Badge variant="secondary" className="text-lg">
                {progress}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              Завършени {Math.round((progress / 100) * 17)} от 17 подточки
            </p>
          </CardContent>
        </Card>

        {/* Структура на обучението - Card-based */}
        <div className="space-y-4">
          {trainingData.map((section) => (
            <TrainingSectionCard
              key={section.id}
              section={section}
              onProgressUpdate={handleProgressUpdate}
              editable={true}
                                  />
          ))}
        </div>
      </main>
    </div>
  );
};

export default TrainingPage;

