import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, CheckCircle2, Circle, GraduationCap, Users, User } from 'lucide-react';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { AppLayout } from '@/components/layouts/AppLayout';

interface TraineeOption {
  id: string;
  name: string;
  email: string;
  realtorId?: string;
  userId?: string;
}

const TrainingProgressPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useUserRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [realtorId, setRealtorId] = useState<string | null>(null);
  const [selectedTraineeEmail, setSelectedTraineeEmail] = useState<string | null>(null);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [selectedTraineeRealtorId, setSelectedTraineeRealtorId] = useState<string | null>(null);
  const [availableTrainees, setAvailableTrainees] = useState<TraineeOption[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [canEdit, setCanEdit] = useState(false);
  const loadingTraineeRef = useRef<string | null>(null);

  // Check if user can edit (admin, managers, team leaders)
  useEffect(() => {
    const canUserEdit = role === 'admin' || 
                       role === 'regional_manager' || 
                       role === 'office_manager' || 
                       role === 'team_leader';
    setCanEdit(canUserEdit);
  }, [role]);

  const fetchAvailableTrainees = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:53',message:'fetchAvailableTrainees called',data:{realtorId,selectedTraineeEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    setLoadingTrainees(true);
    try {
      // Get all training groups
      const groups = await supabaseApi.getAllTrainingGroups();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:57',message:'getAllTrainingGroups result',data:{groupsCount:groups?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
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
      setAvailableTrainees(trainees);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:89',message:'setAvailableTrainees called',data:{traineesCount:trainees.length,selectedTraineeEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // If no trainee is selected and we have trainees, select the first one
      if (!selectedTraineeEmail && trainees.length > 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:92',message:'auto-selecting first trainee',data:{firstTraineeEmail:trainees[0].email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        setSelectedTraineeEmail(trainees[0].email);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:96',message:'fetchAvailableTrainees error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching available trainees:', error);
      toast.error('Грешка при зареждане на курсисти');
    } finally {
      setLoadingTrainees(false);
    }
  }, [realtorId, selectedTraineeEmail]);

  const loadTraineeData = useCallback(async (email: string) => {
    // Prevent concurrent calls for the same email
    if (loadingTraineeRef.current === email) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:103',message:'loadTraineeData skipped - already loading',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    loadingTraineeRef.current = email;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:103',message:'loadTraineeData called',data:{email,selectedTraineeEmail,selectedTraineeId,selectedTraineeRealtorId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      // Find profile by email
      const { data: profile } = await supabaseApi.supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) {
        toast.error('Профилът на курсиста не е намерен.');
        loadingTraineeRef.current = null;
        return;
      }

      setSelectedTraineeId(profile.id);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:145',message:'setSelectedTraineeId called',data:{profileId:profile.id,email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Get realtor by user_id
      const { data: realtor } = await supabaseApi.supabase
        .from('realtors')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (!realtor) {
        toast.error('Курсистът все още няма профил като реализатор.');
        return;
      }

      setSelectedTraineeRealtorId(realtor.id);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:162',message:'setSelectedTraineeRealtorId called',data:{realtorId:realtor.id,profileId:profile.id,email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Get training progress
      const progressData = await supabaseApi.getTrainingProgress(profile.id);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:168',message:'getTrainingProgress result',data:{progressDataLength:progressData?.length||0,profileId:profile.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:162',message:'loadTraineeData completed',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:164',message:'loadTraineeData error',data:{error:error instanceof Error?error.message:String(error),email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error loading trainee data:', error);
      toast.error('Грешка при зареждане на данни за обучение.');
    } finally {
      // Clear the loading ref if this was the current email
      if (loadingTraineeRef.current === email) {
        loadingTraineeRef.current = null;
      }
    }
  }, []); // No dependencies - email is passed as parameter, state updates are handled by the function itself

  const fetchTrainingProgress = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:166',message:'fetchTrainingProgress called',data:{selectedTraineeRealtorId,realtorId,selectedTraineeId,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const targetRealtorId = selectedTraineeRealtorId || realtorId;
    if (!targetRealtorId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:168',message:'fetchTrainingProgress early return - no realtorId',data:{targetRealtorId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }

    try {
      const targetUserId = selectedTraineeId || userId;
      if (!targetUserId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:172',message:'fetchTrainingProgress early return - no userId',data:{targetUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }

      const progressData = await supabaseApi.getTrainingProgress(targetUserId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:174',message:'fetchTrainingProgress API result',data:{progressDataLength:progressData?.length||0,targetUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (progressData) {
        // Обновяване на структурата с данни от базата
        setTrainingData((prevData) => {
          const updatedData = prevData.map((section) => ({
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
          setProgress(calculateTrainingProgress(updatedData));
          return updatedData;
        });
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:203',message:'fetchTrainingProgress error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching training progress:', error);
    }
  }, [selectedTraineeRealtorId, realtorId, selectedTraineeId, userId]);

  // Get trainee email from URL params
  useEffect(() => {
    const traineeEmail = searchParams.get('traineeEmail');
    if (traineeEmail) {
      setSelectedTraineeEmail(traineeEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:287',message:'useEffect triggered - fetchAvailableTrainees',data:{canEdit,realtorId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (canEdit && realtorId) {
      fetchAvailableTrainees();
    }
  }, [canEdit, realtorId, fetchAvailableTrainees]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:232',message:'useEffect triggered - trainee selection',data:{selectedTraineeEmail,realtorId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (selectedTraineeEmail) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:234',message:'calling loadTraineeData',data:{selectedTraineeEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      loadTraineeData(selectedTraineeEmail);
    } else if (realtorId && !selectedTraineeEmail) {
      // Only fetch own progress if no trainee is selected
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/afab9161-da85-4096-948d-ddd71db07ca9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TrainingProgressPage.tsx:237',message:'calling fetchTrainingProgress',data:{realtorId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      fetchTrainingProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTraineeEmail, realtorId]); // Only depend on selectedTraineeEmail and realtorId - loadTraineeData and fetchTrainingProgress are stable

  const fetchUserData = async () => {
    try {
        // Viewing own progress
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

  const handleProgressUpdate = async (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => {
    const targetRealtorId = selectedTraineeRealtorId || realtorId;
    if (!targetRealtorId || !canEdit) return;

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
        const targetRealtorId = selectedTraineeRealtorId || realtorId;
        if (!targetRealtorId) return;

        await supabaseApi.updateTrainingProgress({
          realtorId: targetRealtorId,
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
          <h1 className="text-lg font-semibold text-foreground">Отбелязване на обучение</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Маркирайте завършени подточки и изпити</p>
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
                  navigate(`/training-progress?traineeEmail=${encodeURIComponent(email)}`, { replace: true });
                }}
                disabled={loadingTrainees}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder={loadingTrainees ? "Зареждане..." : "Изберете курсист"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTrainees.map((trainee) => (
                    <SelectItem key={trainee.email} value={trainee.email}>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xs border-2 border-primary/30">
                          {trainee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{formatNameWithEmoji(trainee.name)}</p>
                          <p className="text-xs text-muted-foreground">{trainee.email}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

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
      </div>
    </AppLayout>
  );
};

export default TrainingProgressPage;

