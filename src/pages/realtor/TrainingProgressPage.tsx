import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LogOut, BookOpen, ArrowLeft, CheckCircle2, Circle, GraduationCap } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TrainingProgressPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [realtorId, setRealtorId] = useState<string | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (realtorId) {
      fetchTrainingProgress();
    }
  }, [realtorId, fetchTrainingProgress]);

  const fetchUserData = async () => {
    try {
      const { user } = await supabaseApi.getCurrentUser();
      if (user) {
        setUserId(user.id);
        const realtor = await supabaseApi.getCurrentRealtor();
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

  const fetchTrainingProgress = useCallback(async () => {
    if (!realtorId) return;

    try {
      const progressData = await supabaseApi.getTrainingProgress();

      if (progressData) {
        // Обновяване на структурата с данни от базата
        const updatedData = trainingData.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => {
            const progressItem = progressData.find(
              (p: { section: string; subsection: string }) => p.section === section.id && p.subsection === subsection.id
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
  }, [realtorId, trainingData]);

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
        await supabaseApi.updateTrainingProgress({
          section: sectionId,
          subsection: subsectionId,
          lecture_completed: subsection.progress.lecture,
          video_completed: subsection.progress.video,
          practical_completed: subsection.progress.practical,
          handover_completed: subsection.progress.handover,
          exam_completed: subsection.progress.exam,
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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleLogout = async () => {
    await supabaseApi.logout();
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
                <h1 className="text-lg font-semibold text-foreground">Отбелязване на обучение</h1>
                <p className="text-xs text-muted-foreground">Маркирайте завършени подточки и изпити</p>
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Назад</span>
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
                <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
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

        {/* Структура на обучението */}
        <div className="space-y-4">
          {trainingData.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const totalSubsections = section.subsections.length;
            const completedSubsections = section.subsections.filter(sub => 
              sub.progress.lecture && 
              sub.progress.video && 
              sub.progress.practical && 
              sub.progress.handover && 
              sub.progress.exam
            ).length;
            const sectionProgress = totalSubsections > 0 ? (completedSubsections / totalSubsections) * 100 : 0;
            const isSectionCompleted = completedSubsections === totalSubsections && totalSubsections > 0;

            return (
              <Card 
                key={section.id} 
                className={cn(
                  "transition-all duration-300 hover:shadow-lg",
                  isSectionCompleted && "border-2 border-green-500 bg-green-50 dark:bg-green-950/20"
                )}
              >
                <CardHeader 
                  className="p-3 sm:p-6 cursor-pointer"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1">
                      <div className={cn(
                        "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                        isSectionCompleted ? "bg-green-500/20" : "bg-primary/10"
                      )}>
                        {isSectionCompleted ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <CardTitle className={cn(
                          "text-sm sm:text-base md:text-lg break-words",
                          isSectionCompleted && "text-green-600 dark:text-green-400 font-bold"
                        )}>
                          {section.title}
                          {isSectionCompleted && (
                            <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                          )}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 break-words">
                          {completedSubsections} от {totalSubsections} подточки завършени
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                      {isSectionCompleted ? (
                        <Badge className="bg-green-500 text-white text-xs sm:text-sm">
                          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                          Завършен
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs sm:text-sm">
                          {Math.round(sectionProgress)}%
                        </Badge>
                      )}
                      <ArrowLeft className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform flex-shrink-0",
                        isExpanded ? "rotate-90" : "-rotate-90"
                      )} />
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3 sm:space-y-4 p-3 sm:p-6">
                    {/* Section Progress Bar */}
                    <div className="pb-2 border-b border-border">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm text-muted-foreground break-words">Прогрес на раздела</span>
                        <span className="text-xs sm:text-sm font-semibold flex-shrink-0 ml-2">{Math.round(sectionProgress)}%</span>
                      </div>
                      <Progress value={sectionProgress} className="h-1.5 sm:h-2" />
                    </div>

                    {/* Subsections */}
                    <div className="space-y-3 sm:space-y-4">
                      {section.subsections.map((subsection) => {
                        const { lecture, video, practical, handover, exam } = subsection.progress;
                        const completed = lecture && video && practical && handover && exam;
                        const totalSteps = 5;
                        const completedSteps = [lecture, video, practical, handover, exam].filter(Boolean).length;
                        const progressPercentage = (completedSteps / totalSteps) * 100;

                        return (
                          <Card 
                            key={subsection.id}
                            className={cn(
                              "transition-all duration-300",
                              completed && "border-2 border-green-500 bg-green-50 dark:bg-green-950/20"
                            )}
                          >
                            <CardHeader className="p-3 sm:p-6">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className={cn(
                                  "text-sm sm:text-base md:text-lg flex-1 break-words",
                                  completed && "text-green-600 dark:text-green-400 font-semibold"
                                )}>
                                  {subsection.title}
                                  {completed && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                                  )}
                                </CardTitle>
                                <Badge variant={completed ? "default" : "outline"} className={cn(
                                  completed && "bg-green-500 text-white",
                                  "text-xs sm:text-sm flex-shrink-0"
                                )}>
                                  {completed ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                      <span>Завършено</span>
                                    </>
                                  ) : (
                                    <Circle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  )}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                              {/* Checkboxes Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                                <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                  <span className="text-xs sm:text-sm font-medium text-center">Лекция</span>
                                  <Checkbox
                                    checked={lecture}
                                    onCheckedChange={(checked) =>
                                      handleProgressUpdate(section.id, subsection.id, 'lecture', checked as boolean)
                                    }
                                    className="scale-110 sm:scale-125"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                  <span className="text-xs sm:text-sm font-medium text-center">Видео</span>
                                  <Checkbox
                                    checked={video}
                                    onCheckedChange={(checked) =>
                                      handleProgressUpdate(section.id, subsection.id, 'video', checked as boolean)
                                    }
                                    className="scale-110 sm:scale-125"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                  <span className="text-xs sm:text-sm font-medium text-center">Практическо</span>
                                  <Checkbox
                                    checked={practical}
                                    onCheckedChange={(checked) =>
                                      handleProgressUpdate(section.id, subsection.id, 'practical', checked as boolean)
                                    }
                                    className="scale-110 sm:scale-125"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                  <span className="text-xs sm:text-sm font-medium text-center">Предаване</span>
                                  <Checkbox
                                    checked={handover}
                                    onCheckedChange={(checked) =>
                                      handleProgressUpdate(section.id, subsection.id, 'handover', checked as boolean)
                                    }
                                    className="scale-110 sm:scale-125"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-primary hover:bg-primary/10 transition-colors bg-primary/5">
                                  <span className="text-xs sm:text-sm font-semibold text-center">Изпит</span>
                                  <Checkbox
                                    checked={exam}
                                    onCheckedChange={(checked) =>
                                      handleProgressUpdate(section.id, subsection.id, 'exam', checked as boolean)
                                    }
                                    className="scale-110 sm:scale-125"
                                  />
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="pt-2 border-t border-border">
                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide break-words">
                                    Прогрес
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2">
                                    {Math.round(progressPercentage)}%
                                  </span>
                                </div>
                                <Progress value={progressPercentage} className="h-1.5 sm:h-2" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TrainingProgressPage;

