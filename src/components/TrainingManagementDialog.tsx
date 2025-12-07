import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Circle, BookOpen, GraduationCap } from 'lucide-react';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { supabaseApi } from '@/lib/supabaseApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TrainingManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  realtorId: string;
  realtorName: string;
}

export const TrainingManagementDialog = ({
  open,
  onOpenChange,
  realtorId,
  realtorName,
}: TrainingManagementDialogProps) => {
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchTrainingProgress = useCallback(async () => {
    if (!realtorId || !open) return;
    
    setLoading(true);
    try {
      const progressData = await supabaseApi.getTrainingProgress(realtorId);

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
      toast.error('Грешка при зареждане на прогреса');
    } finally {
      setLoading(false);
    }
  }, [realtorId, open, trainingData]);

  useEffect(() => {
    if (open) {
      fetchTrainingProgress();
    }
  }, [open, fetchTrainingProgress]);

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
          realtorId: realtorId,
        });

        // Ако изпитът е минат, показваме съобщение
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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление на обучение - {realtorName}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Зареждане...</div>
        ) : (
          <div className="space-y-4">
            {/* Прогрес бар */}
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Общ прогрес на обучението
                  </CardTitle>
                  <Badge variant="secondary">{progress}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
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
                      className="p-4 cursor-pointer"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isSectionCompleted ? "bg-green-500/20" : "bg-primary/10"
                          )}>
                            {isSectionCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <BookOpen className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <CardTitle className={cn(
                              "text-base",
                              isSectionCompleted && "text-green-600 dark:text-green-400 font-bold"
                            )}>
                              {section.title}
                              {isSectionCompleted && (
                                <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {completedSubsections} от {totalSubsections} подточки завършени
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSectionCompleted ? (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Завършен
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {Math.round(sectionProgress)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 space-y-4 p-4">
                        {/* Section Progress Bar */}
                        <div className="pb-2 border-b border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Прогрес на раздела</span>
                            <span className="text-sm font-semibold">{Math.round(sectionProgress)}%</span>
                          </div>
                          <Progress value={sectionProgress} className="h-2" />
                        </div>

                        {/* Subsections */}
                        <div className="space-y-4">
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
                                <CardHeader className="p-4">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className={cn(
                                      "text-base flex-1",
                                      completed && "text-green-600 dark:text-green-400 font-semibold"
                                    )}>
                                      {subsection.title}
                                      {completed && (
                                        <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                                      )}
                                    </CardTitle>
                                    <Badge variant={completed ? "default" : "outline"} className={cn(
                                      completed && "bg-green-500 text-white"
                                    )}>
                                      {completed ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Завършено
                                        </>
                                      ) : (
                                        <Circle className="h-3 w-3" />
                                      )}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4 p-4">
                                  {/* Checkboxes Grid */}
                                  <div className="grid grid-cols-5 gap-4">
                                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                      <span className="text-sm font-medium">Лекция</span>
                                      <Checkbox
                                        checked={lecture}
                                        onCheckedChange={(checked) =>
                                          handleProgressUpdate(section.id, subsection.id, 'lecture', checked as boolean)
                                        }
                                        className="scale-125"
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                      <span className="text-sm font-medium">Видео</span>
                                      <Checkbox
                                        checked={video}
                                        onCheckedChange={(checked) =>
                                          handleProgressUpdate(section.id, subsection.id, 'video', checked as boolean)
                                        }
                                        className="scale-125"
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                      <span className="text-sm font-medium">Практическо</span>
                                      <Checkbox
                                        checked={practical}
                                        onCheckedChange={(checked) =>
                                          handleProgressUpdate(section.id, subsection.id, 'practical', checked as boolean)
                                        }
                                        className="scale-125"
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                      <span className="text-sm font-medium">Предаване</span>
                                      <Checkbox
                                        checked={handover}
                                        onCheckedChange={(checked) =>
                                          handleProgressUpdate(section.id, subsection.id, 'handover', checked as boolean)
                                        }
                                        className="scale-125"
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-primary hover:bg-primary/10 transition-colors bg-primary/5">
                                      <span className="text-sm font-semibold">Изпит</span>
                                      <Checkbox
                                        checked={exam}
                                        onCheckedChange={(checked) =>
                                          handleProgressUpdate(section.id, subsection.id, 'exam', checked as boolean)
                                        }
                                        className="scale-125"
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="pt-2 border-t border-border">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Прогрес
                                      </span>
                                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {Math.round(progressPercentage)}%
                                      </span>
                                    </div>
                                    <Progress value={progressPercentage} className="h-2" />
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
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Затвори</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

