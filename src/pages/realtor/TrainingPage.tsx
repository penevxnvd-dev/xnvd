import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Users, User, GraduationCap, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { trainingStructure, calculateTrainingProgress, TrainingSection, isTrainingFullyCompleted, hasCompletedIntroductoryTraining } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { hasPermission } from '@/utils/permissions';
import { AppLayout } from '@/components/layouts/AppLayout';

interface TrainingProgress {
  section: string;
  subsection: string;
  lectureCompleted: boolean;
  videoCompleted: boolean;
  practicalCompleted: boolean;
  handoverCompleted: boolean;
  examCompleted: boolean;
}

interface TraineeOption {
  id: string;
  name: string;
  email: string;
  realtorId?: string;
  userId?: string;
  hasIntroductoryTraining?: boolean;
}

const STORAGE_KEY = 'trainingPageState';

interface TrainingPageState {
  selectedTraineeEmail: string | null;
  expandedSections: string[];
  lastUpdated: number;
}

const TrainingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useUserRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [realtorId, setRealtorId] = useState<string | null>(null);
  const [selectedTraineeEmail, setSelectedTraineeEmail] = useState<string | null>(null);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [selectedTraineeRealtorId, setSelectedTraineeRealtorId] = useState<string | null>(null);
  const [availableTrainees, setAvailableTrainees] = useState<TraineeOption[]>([]);
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Check if user can edit (admin, managers, team leaders) using permission system
  useEffect(() => {
    const canUserEdit = hasPermission(role, 'edit.training');
    setCanEdit(canUserEdit);
  }, [role]);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const state: TrainingPageState = JSON.parse(savedState);
        // Only restore if saved within last 7 days
        const daysSinceUpdate = (Date.now() - state.lastUpdated) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
          if (state.expandedSections && state.expandedSections.length > 0) {
            setExpandedSections(new Set(state.expandedSections));
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }, []);

  // Get trainee email from URL params or saved state
  useEffect(() => {
    const traineeEmail = searchParams.get('traineeEmail');
    if (traineeEmail) {
      setSelectedTraineeEmail(traineeEmail);
    } else {
      // Try to restore from localStorage if no URL param
      try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const state: TrainingPageState = JSON.parse(savedState);
          const daysSinceUpdate = (Date.now() - state.lastUpdated) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate < 7 && state.selectedTraineeEmail) {
            setSelectedTraineeEmail(state.selectedTraineeEmail);
          }
        }
      } catch (error) {
        console.error('Error loading saved trainee:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (canEdit) {
      fetchAvailableTrainees();
    }
  }, [canEdit]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const state: TrainingPageState = {
        selectedTraineeEmail,
        expandedSections: Array.from(expandedSections),
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [selectedTraineeEmail, expandedSections]);

  useEffect(() => {
    if (selectedTraineeEmail) {
      loadTraineeData(selectedTraineeEmail);
    } else if (realtorId) {
      fetchTrainingProgress();
    }
  }, [selectedTraineeEmail, realtorId]);

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

  const fetchAvailableTrainees = async () => {
    setLoadingTrainees(true);
    try {
      // Get all training groups
      const groups = await supabaseApi.getAllTrainingGroups();
      
      // Extract all unique trainees
      const traineesMap = new Map<string, TraineeOption>();
      
      groups.forEach(group => {
        group.trainees.forEach(trainee => {
          if (trainee.email && !traineesMap.has(trainee.email)) {
            traineesMap.set(trainee.email, {
              id: trainee.id,
              name: trainee.name,
              email: trainee.email,
            });
          }
        });
      });

      // Also add current user if they're a realtor
      if (realtorId) {
        const { user } = await api.getCurrentUser();
        if (user?.email) {
          traineesMap.set(user.email, {
            id: user.id,
            name: user.full_name || user.email,
            email: user.email,
            realtorId: realtorId,
            userId: user.id,
          });
        }
      }

      const trainees = Array.from(traineesMap.values());
      
      // Load introductory training status for each trainee
      const traineesWithStatus = await Promise.all(
        trainees.map(async (trainee) => {
          try {
            const userId = trainee.userId || trainee.id;
            const progressData = await supabaseApi.getTrainingProgress(userId);
            const updatedTrainingData = trainingStructure.map((section) => ({
              ...section,
              subsections: section.subsections.map((subsection) => {
                const progressItem = progressData.find(
                  (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
                );
                return {
                  ...subsection,
                  progress: progressItem
                    ? {
                        lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                        video: (progressItem as { video_completed?: boolean }).video_completed || false,
                        practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                        handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                        exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                      }
                    : subsection.progress,
                };
              }),
            }));
            
            return {
              ...trainee,
              hasIntroductoryTraining: hasCompletedIntroductoryTraining(updatedTrainingData),
            };
          } catch (error) {
            console.error(`Error loading status for trainee ${trainee.email}:`, error);
            return {
              ...trainee,
              hasIntroductoryTraining: false,
            };
          }
        })
      );
      
      setAvailableTrainees(traineesWithStatus);
      
      // If no trainee is selected and we have trainees, select the first one
      if (!selectedTraineeEmail && traineesWithStatus.length > 0) {
        setSelectedTraineeEmail(traineesWithStatus[0].email);
      }
    } catch (error) {
      console.error('Error fetching available trainees:', error);
      toast.error('Грешка при зареждане на курсисти');
    } finally {
      setLoadingTrainees(false);
    }
  };

  const loadTraineeData = async (email: string) => {
    try {
      // Find profile by email
      const { data: profile } = await supabaseApi.supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) {
        toast.error('Профилът на курсиста не е намерен.');
        return;
      }

      setSelectedTraineeId(profile.id);

      // Get realtor by user_id (or create one if it doesn't exist for trainees)
      let { data: realtor } = await supabaseApi.supabase
        .from('realtors')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      // If no realtor record exists, create one for training progress tracking
      if (!realtor) {
        const { data: newRealtor, error: createError } = await supabaseApi.supabase
          .from('realtors')
          .insert({
            user_id: profile.id,
            team_id: null,
            level: 1, // Start as trainee level
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating realtor record for trainee:', createError);
          toast.error('Грешка при създаване на профил за обучение.');
        return;
        }
        realtor = newRealtor;
      }

      setSelectedTraineeRealtorId(realtor.id);

      // Get training progress
      const progressData = await supabaseApi.getTrainingProgress(profile.id);

      // Update training structure with progress
      const updatedData = trainingStructure.map((section) => ({
        ...section,
        subsections: section.subsections.map((subsection) => {
          const progressItem = progressData.find(
            (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
          );
          return {
            ...subsection,
            progress: progressItem
              ? {
                  lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                  video: (progressItem as { video_completed?: boolean }).video_completed || false,
                  practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                  handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                  exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                }
              : subsection.progress,
          };
        }),
      }));

      setTrainingData(updatedData);
      setProgress(calculateTrainingProgress(updatedData));
    } catch (error) {
      console.error('Error loading trainee data:', error);
      toast.error('Грешка при зареждане на данни за обучение.');
    }
  };

  const fetchTrainingProgress = useCallback(async () => {
    const targetRealtorId = selectedTraineeRealtorId || realtorId;
    if (!targetRealtorId) return;

    try {
      const targetUserId = selectedTraineeId || userId;
      if (!targetUserId) return;

      const progressData = await supabaseApi.getTrainingProgress(targetUserId);

      if (progressData && progressData.length > 0) {
        const updatedData = trainingStructure.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => {
            const progressItem = progressData.find(
              (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
            );
            return {
              ...subsection,
              progress: progressItem
                ? {
                    lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                    video: (progressItem as { video_completed?: boolean }).video_completed || false,
                    practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                    handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                    exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                  }
                : subsection.progress,
            };
          }),
        }));

        setTrainingData(updatedData);
        setProgress(calculateTrainingProgress(updatedData));
      } else {
        setTrainingData(trainingStructure);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error fetching training progress:', error);
      setTrainingData(trainingStructure);
      setProgress(0);
    }
  }, [selectedTraineeRealtorId, realtorId, selectedTraineeId, userId]);

  const handleProgressUpdate = async (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => {
    const targetRealtorId = selectedTraineeRealtorId || realtorId;
    if (!targetRealtorId || !canEdit) return;

    // Update local state
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

    // Save to database immediately
    setSaving(true);
    try {
      await supabaseApi.updateTrainingProgress({
        realtorId: targetRealtorId,
        section: sectionId,
        subsection: subsectionId,
        lectureCompleted: field === 'lecture' ? checked : undefined,
        videoCompleted: field === 'video' ? checked : undefined,
        practicalCompleted: field === 'practical' ? checked : undefined,
        handoverCompleted: field === 'handover' ? checked : undefined,
        examCompleted: field === 'exam' ? checked : undefined,
      });

      // Update introductory training status for trainees list (don't block on error)
      try {
        await updateTraineesIntroductoryStatus();
      } catch (statusError) {
        console.error('Error updating trainees introductory status:', statusError);
        // Don't throw - this is a non-critical operation
      }

      // Reload training data to check if training is fully completed
      const targetUserId = selectedTraineeId || userId;
      if (targetUserId) {
        const updatedProgressData = await supabaseApi.getTrainingProgress(targetUserId);
        const updatedTrainingData = trainingStructure.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => {
            const progressItem = updatedProgressData.find(
              (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
            );
            return {
              ...subsection,
              progress: progressItem
                ? {
                    lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                    video: (progressItem as { video_completed?: boolean }).video_completed || false,
                    practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                    handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                    exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                  }
                : subsection.progress,
            };
          }),
        }));

        // Update local training data
        setTrainingData(updatedTrainingData);
        setProgress(calculateTrainingProgress(updatedTrainingData));

        // Check if training is fully completed and promote trainee to realtor
        if (isTrainingFullyCompleted(updatedTrainingData) && selectedTraineeId) {
          try {
            // Get team_id if available
            const { data: realtor } = await supabaseApi.supabase
              .from('realtors')
              .select('team_id')
              .eq('user_id', selectedTraineeId)
              .maybeSingle();

            await supabaseApi.promoteTraineeToRealtor(selectedTraineeId, realtor?.team_id || undefined);
            toast.success('🎉 Обучението е завършено! Курсистът е повишен до Реализатор.');
          } catch (error) {
            console.error('Error promoting trainee:', error);
            // Don't show error to user, just log it
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error updating training progress:', error);
      
      // Show more detailed error message
      let errorMessage = 'Грешка при запазване на прогреса';
      if (error instanceof Error) {
        errorMessage = `Грешка при запазване на прогреса: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = `Грешка при запазване на прогреса: ${String((error as { message: unknown }).message)}`;
      }
      
      toast.error(errorMessage);
      
      // Revert local state changes on error
      // Reload training data to get the correct state from server
      const targetUserId = selectedTraineeId || userId;
      if (targetUserId) {
        try {
          const progressData = await supabaseApi.getTrainingProgress(targetUserId);
          const revertedTrainingData = trainingStructure.map((section) => ({
            ...section,
            subsections: section.subsections.map((subsection) => {
              const progressItem = progressData.find(
                (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
              );
              return {
                ...subsection,
                progress: progressItem
                  ? {
                      lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                      video: (progressItem as { video_completed?: boolean }).video_completed || false,
                      practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                      handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                      exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                    }
                  : subsection.progress,
              };
            }),
          }));
          setTrainingData(revertedTrainingData);
          setProgress(calculateTrainingProgress(revertedTrainingData));
        } catch (revertError) {
          console.error('Error reverting training data:', revertError);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // Function to update introductory training status for all trainees
  const updateTraineesIntroductoryStatus = async () => {
    try {
      const updatedTrainees = await Promise.all(
        availableTrainees.map(async (trainee) => {
          try {
            const userId = trainee.userId || trainee.id;
            const progressData = await supabaseApi.getTrainingProgress(userId);
            const updatedTrainingData = trainingStructure.map((section) => ({
              ...section,
              subsections: section.subsections.map((subsection) => {
                const progressItem = progressData.find(
                  (p: { section?: string; subsection?: string }) => p.section === section.id && p.subsection === subsection.id
                );
                return {
                  ...subsection,
                  progress: progressItem
                    ? {
                        lecture: (progressItem as { lecture_completed?: boolean }).lecture_completed || false,
                        video: (progressItem as { video_completed?: boolean }).video_completed || false,
                        practical: (progressItem as { practical_completed?: boolean }).practical_completed || false,
                        handover: (progressItem as { handover_completed?: boolean }).handover_completed || false,
                        exam: (progressItem as { exam_completed?: boolean }).exam_completed || false,
                      }
                    : subsection.progress,
                };
              }),
            }));
            
            return {
              ...trainee,
              hasIntroductoryTraining: hasCompletedIntroductoryTraining(updatedTrainingData),
            };
          } catch (error) {
            console.error(`Error updating status for trainee ${trainee.email}:`, error);
            return trainee;
          }
        })
      );
      
      setAvailableTrainees(updatedTrainees);
    } catch (error) {
      console.error('Error updating trainees introductory status:', error);
    }
  };


  const selectedTrainee = availableTrainees.find(t => t.email === selectedTraineeEmail);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  return (
    <AppLayout
      customNavbarContent={
              <div>
                <h1 className="text-lg font-semibold text-foreground">Обучение</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Проследяване на обучителен прогрес</p>
        </div>
      }
    >
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Trainee Selector - Only for managers/leaders */}
        {canEdit && availableTrainees.length > 0 && (
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary border-2 border-primary/30">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Избор на курсист
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Изберете курсист за преглед на прогреса му
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Select
                value={selectedTraineeEmail || ''}
                onValueChange={(email) => {
                  setSelectedTraineeEmail(email);
                  navigate(`/training?traineeEmail=${encodeURIComponent(email)}`, { replace: true });
                }}
                disabled={loadingTrainees}
              >
                <SelectTrigger className="w-full h-11">
                  <div className="flex items-center justify-between w-full">
                  <SelectValue placeholder={loadingTrainees ? "Зареждане..." : "Изберете курсист"} />
                    {saving && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                        <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Запазване...</span>
                      </div>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableTrainees.map((trainee) => (
                    <SelectItem key={trainee.email} value={trainee.email}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xs border-2 border-primary/30 flex-shrink-0">
                          {trainee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{formatNameWithEmoji(trainee.name)}</p>
                            <p className="text-xs text-muted-foreground truncate">{trainee.email}</p>
                          </div>
                        </div>
                        {trainee.hasIntroductoryTraining && (
                          <Badge variant="outline" className="flex-shrink-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Вътрешно
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Selected Trainee Info */}
        {selectedTrainee && (
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/30 flex-shrink-0">
                  {selectedTrainee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">{formatNameWithEmoji(selectedTrainee.name)}</h2>
                  <p className="text-sm text-muted-foreground">{selectedTrainee.email}</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Курсист
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress bar */}
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BookOpen className="h-5 w-5" />
                <span>Общ прогрес на обучението</span>
              </CardTitle>
              <Badge variant="secondary" className="text-base sm:text-lg px-3 py-1">
                {progress}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <Progress value={progress} className="h-3 mb-2" />
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Завършени {Math.round((progress / 100) * 21)} от 21 подточки
              </p>
              <div className="flex items-center gap-2">
                {progress === 100 ? (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Завършено
                  </Badge>
                ) : progress > 0 ? (
                  <Badge className="bg-blue-500 text-white">
                    <PlayCircle className="h-3 w-3 mr-1" />
                    В процес
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    Незапочнато
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Structure */}
        <div className="space-y-4">
          {trainingData.map((section) => (
            <TrainingSectionCard
              key={section.id}
              section={section}
              onProgressUpdate={handleProgressUpdate}
              editable={canEdit}
              isExpanded={expandedSections.has(section.id)}
              onToggleExpanded={(sectionId) => {
                const newExpanded = new Set(expandedSections);
                if (newExpanded.has(sectionId)) {
                  newExpanded.delete(sectionId);
                } else {
                  newExpanded.add(sectionId);
                }
                setExpandedSections(newExpanded);
              }}
            />
          ))}
        </div>
    </div>
    </AppLayout>
  );
};

export default TrainingPage;
