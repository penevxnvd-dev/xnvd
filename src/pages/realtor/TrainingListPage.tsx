import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, GraduationCap, Search, Users, User, CheckCircle2, Clock, PlayCircle, ChevronLeft, FileCheck, Video, Briefcase, Handshake, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { calculateTrainingProgress, trainingStructure } from '@/data/trainingStructure';
import { toast } from 'sonner';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useUserRole } from '@/hooks/useUserRole';

interface TraineeProgress {
  id: string;
  name: string;
  email: string;
  userId?: string;
  realtorId?: string;
  progress: number;
  completedSubsections: number;
  totalSubsections: number;
  type: 'trainee' | 'realtor';
}

const TrainingListPage = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [trainees, setTrainees] = useState<TraineeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'trainees' | 'completed' | 'in-progress'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [traineeProgressData, setTraineeProgressData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchAllTrainees();
  }, []);

  // Fetch current user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { user } = await supabaseApi.getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: profile } = await supabaseApi.supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (profile?.full_name) {
            setCurrentUserName(profile.full_name);
          } else {
            setCurrentUserName(user.email?.split('@')[0] || undefined);
          }
          
          if (user.email) {
            setUserEmail(user.email);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    fetchUserInfo();
  }, []);


  // Calculate statistics
  const totalTrainees = trainees.length;
  const completedTrainees = trainees.filter(t => t.progress === 100).length;
  const inProgressTrainees = trainees.filter(t => t.progress > 0 && t.progress < 100).length;
  const newTrainees = trainees.filter(t => t.type === 'trainee').length;

  const fetchAllTrainees = async () => {
    setLoading(true);
    try {
      const allTrainees: TraineeProgress[] = [];

      // 1. Get all trainees from training groups
      const groups = await supabaseApi.getAllTrainingGroups();
      const traineesMap = new Map<string, TraineeProgress>();

      groups.forEach(group => {
        group.trainees.forEach(trainee => {
          if (trainee.email && !traineesMap.has(trainee.email)) {
            traineesMap.set(trainee.email, {
              id: trainee.id,
              name: trainee.name,
              email: trainee.email,
              progress: 0,
              completedSubsections: 0,
              totalSubsections: 0,
              type: 'trainee'
            });
          }
        });
      });

      // 2. Get all realtors with their profiles
      const { data: realtors, error: realtorsError } = await supabaseApi.supabase
        .from('realtors')
        .select(`
          id,
          user_id
        `);

      if (!realtorsError && realtors) {
        // Get profiles for all realtors
        const userIds = realtors.map((r: any) => r.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabaseApi.supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          if (!profilesError && profiles) {
            const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
            
            realtors.forEach((realtor: any) => {
              const profile = profilesMap.get(realtor.user_id);
              if (profile && profile.email) {
                if (!traineesMap.has(profile.email)) {
                  traineesMap.set(profile.email, {
                    id: profile.id,
                    name: profile.full_name || profile.email,
                    email: profile.email,
                    userId: profile.id,
                    realtorId: realtor.id,
                    progress: 0,
                    completedSubsections: 0,
                    totalSubsections: 0,
                    type: 'realtor'
                  });
                } else {
                  // Update existing trainee with realtor info
                  const existing = traineesMap.get(profile.email)!;
                  existing.userId = profile.id;
                  existing.realtorId = realtor.id;
                  existing.type = 'realtor';
                }
              }
            });
          }
        }
      }

      // 3. Calculate progress for each trainee/realtor
      const traineesArray = Array.from(traineesMap.values());
      const totalSubsections = trainingStructure.reduce((sum, section) => sum + section.subsections.length, 0);

      for (const trainee of traineesArray) {
        if (trainee.userId) {
          try {
            const progressData = await supabaseApi.getTrainingProgress(trainee.userId);
            
            if (progressData && progressData.length > 0) {
              const updatedData = trainingStructure.map((section) => ({
                ...section,
                subsections: section.subsections.map((subsection) => {
                  const progressItem = progressData.find(
                    (p: { section?: string; subsection?: string }) => 
                      p.section === section.id && p.subsection === subsection.id
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

              const progress = calculateTrainingProgress(updatedData);
              const completedSubsections = updatedData.reduce((sum, section) => 
                sum + section.subsections.filter(sub => 
                  sub.progress.lecture && 
                  sub.progress.video && 
                  sub.progress.practical && 
                  sub.progress.handover && 
                  sub.progress.exam
                ).length, 0
              );

              trainee.progress = progress;
              trainee.completedSubsections = completedSubsections;
              trainee.totalSubsections = totalSubsections;
            } else {
              trainee.totalSubsections = totalSubsections;
            }
          } catch (error) {
            console.error(`Error fetching progress for ${trainee.email}:`, error);
            trainee.totalSubsections = totalSubsections;
          }
        } else {
          trainee.totalSubsections = totalSubsections;
        }
      }

      // Sort by progress (descending) then by name
      traineesArray.sort((a, b) => {
        if (b.progress !== a.progress) {
          return b.progress - a.progress;
        }
        return a.name.localeCompare(b.name, 'bg');
      });

      setTrainees(traineesArray);
    } catch (error) {
      console.error('Error fetching trainees:', error);
      toast.error('Грешка при зареждане на курсисти и реализатори');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainees = useMemo(() => {
    let filtered = trainees;
    
    // Apply filter
    if (activeFilter === 'trainees') {
      filtered = filtered.filter(t => t.type === 'trainee');
    } else if (activeFilter === 'completed') {
      filtered = filtered.filter(t => t.progress === 100);
    } else if (activeFilter === 'in-progress') {
      filtered = filtered.filter(t => t.progress > 0 && t.progress < 100);
    }
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [trainees, activeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTrainees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTrainees = filteredTrainees.slice(startIndex, endIndex);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const handleViewFullProgress = (trainee: TraineeProgress) => {
    if (trainee.email) {
      navigate(`/training?traineeEmail=${encodeURIComponent(trainee.email)}`);
    }
    setMenuOpen(null);
  };

  const loadTraineeProgress = async (trainee: TraineeProgress) => {
    if (!trainee.realtorId && !trainee.userId) return;

    try {
      let realtorId = trainee.realtorId;
      
      // If trainee doesn't have a realtor record, try to get or create one
      if (!realtorId && trainee.userId) {
        const realtor = await supabaseApi.getCurrentRealtor(trainee.userId);
        if (realtor) {
          realtorId = realtor.id;
        }
      }

      if (!realtorId) return;

      const progressData = await supabaseApi.getRealtorTrainingProgress(realtorId);
      const progressMap: Record<string, any> = {};
      
      progressData.forEach((p: any) => {
        const key = `${p.section}-${p.subsection}`;
        progressMap[key] = p;
      });

      setTraineeProgressData(prev => ({
        ...prev,
        [trainee.id]: progressMap
      }));
    } catch (error) {
      console.error('Error loading trainee progress:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleToggleProgress = async (
    trainee: TraineeProgress,
    sectionId: string,
    subsectionId: string,
    progressType: 'lecture' | 'video' | 'practical' | 'handover' | 'exam'
  ) => {
    if (!trainee.realtorId && !trainee.userId) {
      toast.error('Няма реализаторски или потребителски ID за този курсист');
      return;
    }

    try {
      let realtorId = trainee.realtorId;
      
      if (!realtorId && trainee.userId) {
        const realtor = await supabaseApi.getCurrentRealtor(trainee.userId);
        if (realtor) {
          realtorId = realtor.id;
        } else {
          // Create a realtor record for the trainee
          const { data: newRealtor, error: createError } = await supabaseApi.supabase
            .from('realtors')
            .insert({
              user_id: trainee.userId,
              level: 1,
            })
            .select()
            .single();
          
          if (createError || !newRealtor) {
            throw new Error('Не можа да се създаде реализаторски запис');
          }
          
          realtorId = newRealtor.id;
        }
      }

      if (!realtorId) {
        toast.error('Не можа да се определи реализаторски ID');
        return;
      }

      // Get current progress
      const progressKey = `${sectionId}-${subsectionId}`;
      const currentProgress = traineeProgressData[trainee.id]?.[progressKey] || {};
      
      const currentValue = progressType === 'lecture' ? currentProgress.lecture_completed :
                          progressType === 'video' ? currentProgress.video_completed :
                          progressType === 'practical' ? currentProgress.practical_completed :
                          progressType === 'handover' ? currentProgress.handover_completed :
                          currentProgress.exam_completed;

      const newValue = !currentValue;

      // Update progress
      await supabaseApi.updateTrainingProgress({
        realtorId: realtorId,
        section: sectionId,
        subsection: subsectionId,
        lectureCompleted: progressType === 'lecture' ? newValue : currentProgress.lecture_completed,
        videoCompleted: progressType === 'video' ? newValue : currentProgress.video_completed,
        practicalCompleted: progressType === 'practical' ? newValue : currentProgress.practical_completed,
        handoverCompleted: progressType === 'handover' ? newValue : currentProgress.handover_completed,
        examCompleted: progressType === 'exam' ? newValue : currentProgress.exam_completed,
      });

      // Update local state
      setTraineeProgressData(prev => ({
        ...prev,
        [trainee.id]: {
          ...prev[trainee.id],
          [progressKey]: {
            ...currentProgress,
            [`${progressType}_completed`]: newValue,
            lecture_completed: progressType === 'lecture' ? newValue : currentProgress.lecture_completed,
            video_completed: progressType === 'video' ? newValue : currentProgress.video_completed,
            practical_completed: progressType === 'practical' ? newValue : currentProgress.practical_completed,
            handover_completed: progressType === 'handover' ? newValue : currentProgress.handover_completed,
            exam_completed: progressType === 'exam' ? newValue : currentProgress.exam_completed,
          }
        }
      }));

      toast.success('Прогресът е обновен');
      
      // Refresh the list to update progress percentage
      await fetchAllTrainees();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Грешка при обновяване на прогреса');
    }
  };

  const customNavbarContent = (
    <>
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">Списък с курсисти и реализатори</h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">Преглед на прогрес в обучението</p>
      </div>
      <div className="flex items-center gap-3 flex-1 justify-center min-w-0 hidden md:flex">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 animate-pulse">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))
          ) : (
            <>
              {/* Общо курсисти */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      onClick={() => setActiveFilter('all')}
                      className={cn(
                        "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer",
                        activeFilter === 'all' 
                          ? "bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 border-primary/40 dark:border-primary/50 shadow-md" 
                          : "bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-primary/20 dark:border-primary/30 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-sm"
                      )}
                    >
                      <div className="p-0.5 rounded-full bg-primary/20 dark:bg-primary/30 group-hover:bg-primary/30 dark:group-hover:bg-primary/40 transition-colors">
                        <Users className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-sm font-bold text-primary">{totalTrainees}</span>
                      <span className="text-[10px] font-medium text-primary/70 dark:text-primary/60 hidden lg:inline">Общо</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">Общо курсисти: {totalTrainees}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Нови курсисти */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      onClick={() => setActiveFilter('trainees')}
                      className={cn(
                        "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer",
                        activeFilter === 'trainees'
                          ? "bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/40 dark:to-blue-800/30 border-blue-400/60 dark:border-blue-600/50 shadow-md"
                          : "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                      )}
                    >
                      <div className="p-0.5 rounded-full bg-blue-500/20 dark:bg-blue-400/20 group-hover:bg-blue-500/30 dark:group-hover:bg-blue-400/30 transition-colors">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{newTrainees}</span>
                      <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 hidden lg:inline">Нови</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">Нови курсисти: {newTrainees}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Завършили */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      onClick={() => setActiveFilter('completed')}
                      className={cn(
                        "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer",
                        activeFilter === 'completed'
                          ? "bg-gradient-to-br from-green-100 to-green-200/50 dark:from-green-900/40 dark:to-green-800/30 border-green-400/60 dark:border-green-600/50 shadow-md"
                          : "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm"
                      )}
                    >
                      <div className="p-0.5 rounded-full bg-green-500/20 dark:bg-green-400/20 group-hover:bg-green-500/30 dark:group-hover:bg-green-400/30 transition-colors">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">{completedTrainees}</span>
                      <span className="text-[10px] font-medium text-green-600/80 dark:text-green-400/80 hidden lg:inline">Завършили</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">Завършили: {completedTrainees}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* В процес */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      onClick={() => setActiveFilter('in-progress')}
                      className={cn(
                        "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer",
                        activeFilter === 'in-progress'
                          ? "bg-gradient-to-br from-orange-100 to-orange-200/50 dark:from-orange-900/40 dark:to-orange-800/30 border-orange-400/60 dark:border-orange-600/50 shadow-md"
                          : "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/60 dark:border-orange-800/40 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm"
                      )}
                    >
                      <div className="p-0.5 rounded-full bg-orange-500/20 dark:bg-orange-400/20 group-hover:bg-orange-500/30 dark:group-hover:bg-orange-400/30 transition-colors">
                        <PlayCircle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{inProgressTrainees}</span>
                      <span className="text-[10px] font-medium text-orange-600/80 dark:text-orange-400/80 hidden lg:inline">В процес</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">В процес: {inProgressTrainees}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <AppLayout customNavbarContent={customNavbarContent}>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Search - Modern Design */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Търсене по име или имейл..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 border-border/60 focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Trainees List - Modern Design */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-2 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTrainees.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'Няма намерени курсисти' : 'Няма курсисти'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Опитайте с различна търсена дума' : 'Все още няма регистрирани курсисти или реализатори'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginatedTrainees.map((trainee) => (
              <div key={trainee.id} className="relative w-full">
                <DropdownMenu open={menuOpen === trainee.id} onOpenChange={(open) => setMenuOpen(open ? trainee.id : null)}>
                  <DropdownMenuTrigger asChild>
                    <Card
                      className={cn(
                        "transition-all duration-300 hover:shadow-lg hover:scale-[1.01] border-border/60 hover:border-primary/40 cursor-pointer w-full",
                        trainee.progress === 100 && "border-2 border-green-500/50 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10"
                      )}
                    >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn(
                        "h-14 w-14 rounded-full flex items-center justify-center text-primary font-bold text-lg border-2 flex-shrink-0 transition-all duration-200",
                        trainee.progress === 100 
                          ? "bg-gradient-to-br from-green-500/20 to-green-400/10 border-green-500/40" 
                          : "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30"
                      )}>
                        {trainee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-semibold text-foreground">
                            {formatNameWithEmoji(trainee.name)}
                          </h3>
                          <Badge 
                            variant={trainee.type === 'realtor' ? 'default' : 'secondary'} 
                            className="text-xs font-medium"
                          >
                            {trainee.type === 'realtor' ? 'Реализатор' : 'Курсист'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-1">{trainee.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Завършени {trainee.completedSubsections} от {trainee.totalSubsections} подточки
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                      <div className="text-right">
                        <div className={cn(
                          "text-2xl font-bold mb-2",
                          trainee.progress === 100 ? "text-green-600 dark:text-green-400" : 
                          trainee.progress > 0 ? "text-blue-600 dark:text-blue-400" : 
                          "text-muted-foreground"
                        )}>
                          {trainee.progress}%
                        </div>
                        <Progress 
                          value={trainee.progress} 
                          className={cn(
                            "h-2.5 w-full",
                            trainee.progress === 100 && "bg-green-500/20"
                          )} 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {trainee.progress === 100 ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Завършено
                          </Badge>
                        ) : trainee.progress > 0 ? (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            В процес
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border/60">
                            <Clock className="h-3 w-3 mr-1" />
                            Незапочнато
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                    </CardContent>
                  </Card>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  side="bottom"
                  className="max-h-[80vh] overflow-y-auto"
                  style={{
                    width: 'var(--radix-dropdown-menu-trigger-width)',
                    minWidth: 'var(--radix-dropdown-menu-trigger-width)',
                  }}
                  onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    loadTraineeProgress(trainee);
                  }}
                >
                  <DropdownMenuLabel className="sticky top-0 bg-popover z-10 pb-2 border-b">
                    <div className="flex flex-col">
                      <span className="font-semibold">{formatNameWithEmoji(trainee.name)}</span>
                      <span className="text-xs text-muted-foreground font-normal">{trainee.email}</span>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={trainee.progress} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{trainee.progress}%</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <div className="p-2 space-y-1">
                    {trainingStructure.map((section) => {
                      const isExpanded = expandedSections.has(section.id);
                      return (
                        <div key={section.id} className="space-y-1">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md transition-colors"
                          >
                            <span>{section.title}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="ml-4 space-y-1 border-l-2 border-border/50 pl-2">
                              {section.subsections.map((subsection) => {
                                const progressKey = `${section.id}-${subsection.id}`;
                                const progress = traineeProgressData[trainee.id]?.[progressKey] || {};
                                
                                const lectureCompleted = progress.lecture_completed || false;
                                const videoCompleted = progress.video_completed || false;
                                const practicalCompleted = progress.practical_completed || false;
                                const handoverCompleted = progress.handover_completed || false;
                                const examCompleted = progress.exam_completed || false;

                                return (
                                  <div key={subsection.id} className="space-y-1.5 py-1">
                                    <div className="text-xs font-semibold text-foreground/80">{subsection.title}</div>
                                    <div className="space-y-1">
                                      <button
                                        onClick={() => handleToggleProgress(trainee, section.id, subsection.id, 'lecture')}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                          lectureCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                        )}
                                      >
                                        <BookOpen className={cn("h-3 w-3", lectureCompleted && "text-green-600 dark:text-green-400")} />
                                        <span className="flex-1 text-left">Лекция</span>
                                        {lectureCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                      </button>
                                      <button
                                        onClick={() => handleToggleProgress(trainee, section.id, subsection.id, 'video')}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                          videoCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                        )}
                                      >
                                        <Video className={cn("h-3 w-3", videoCompleted && "text-green-600 dark:text-green-400")} />
                                        <span className="flex-1 text-left">Видео</span>
                                        {videoCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                      </button>
                                      <button
                                        onClick={() => handleToggleProgress(trainee, section.id, subsection.id, 'practical')}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                          practicalCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                        )}
                                      >
                                        <Briefcase className={cn("h-3 w-3", practicalCompleted && "text-green-600 dark:text-green-400")} />
                                        <span className="flex-1 text-left">Практика</span>
                                        {practicalCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                      </button>
                                      <button
                                        onClick={() => handleToggleProgress(trainee, section.id, subsection.id, 'handover')}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                          handoverCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                        )}
                                      >
                                        <Handshake className={cn("h-3 w-3", handoverCompleted && "text-green-600 dark:text-green-400")} />
                                        <span className="flex-1 text-left">Предаване</span>
                                        {handoverCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                      </button>
                                      <button
                                        onClick={() => handleToggleProgress(trainee, section.id, subsection.id, 'exam')}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors",
                                          examCompleted && "bg-green-500/10 text-green-700 dark:text-green-400"
                                        )}
                                      >
                                        <FileText className={cn("h-3 w-3", examCompleted && "text-green-600 dark:text-green-400")} />
                                        <span className="flex-1 text-left">Изпит</span>
                                        {examCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            ))}

            {/* Modern Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  Предишна
                </Button>
                <div className="text-sm font-medium text-foreground px-4 py-2 rounded-md bg-muted/50">
                  Страница {currentPage} от {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  Следваща
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainingListPage;

