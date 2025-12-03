import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LogOut, BookOpen, ArrowLeft } from 'lucide-react';
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
              (p: any) => p.section === section.id && p.subsection === subsection.id
            );
            return {
              ...subsection,
              progress: progressItem
                ? {
                    lecture: progressItem.lecture_completed,
                    video: progressItem.video_completed,
                    practical: progressItem.practical_completed,
                    handover: progressItem.handover_completed,
                    exam: progressItem.exam_completed,
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
              const newProgress = {
                ...subsection.progress,
                [field]: checked,
              };
              
              // Ако изпитът е минат, автоматично маркираме всички останали стъпки като завършени
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

        // Ако изпитът е минат, показваме съобщение
        if (field === 'exam' && checked) {
          toast.success('Изпитът е минат! Подточката е завършена.');
        } else {
          toast.success('Прогресът е обновен');
        }
      }
    } catch (error: any) {
      toast.error('Грешка при запазване на прогреса');
      console.error(error);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')} 
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Обучение</h1>
                <p className="text-xs text-muted-foreground">Проследяване на обучителен прогрес</p>
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Назад</span>
              </Button>
              <Button onClick={() => navigate('/training-progress')} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Отбелязване</span>
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Изход</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Прогрес бар */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm lg:text-base">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                <span className="break-words">Общ прогрес на обучението</span>
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm lg:text-base flex-shrink-0">
                {progress}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <Progress value={progress} className="h-2 sm:h-3" />
            <p className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-1.5 sm:mt-2 break-words">
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

