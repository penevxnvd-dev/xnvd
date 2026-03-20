import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Target, CheckCircle2, XCircle, BookOpen, Zap, Award, BarChart3, Sparkles } from 'lucide-react';
import { exportKPIData, exportDeals, exportDiagnoses, exportTrainingProgress } from '@/lib/export';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { toast } from 'sonner';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { PersonalGoalsCard } from '@/components/realtor/PersonalGoalsCard';
import { WeeklyBuyerSchedule } from '@/components/realtor/WeeklyBuyerSchedule';
import { Chat } from '@/components/Chat';
import { Crown, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layouts/AppLayout';
import { StatBadge } from '@/components/StatBadge';

interface RealtorData {
  id: string;
  level: number;
  confidence: boolean;
  salesResilience: boolean;
  successMindset: boolean;
  team_id?: string | null;
  user: {
    fullName: string;
    email: string;
  };
}

interface Deal {
  id: string;
  clientName: string;
  dealValue: number;
  dealDate: string;
  isKey?: boolean;
  isExclusive?: boolean;
}

interface Diagnosis {
  id: string;
  clientName: string;
  status: string;
  diagnosisDate: string;
}

interface RealtorDashboardProps {
  userId: string;
}

interface TrainingProgress {
  section: string;
  subsection: string;
  lectureCompleted: boolean;
  videoCompleted: boolean;
  practicalCompleted: boolean;
  handoverCompleted: boolean;
  examCompleted: boolean;
}

// Мемоизирай компонента за да предотвратиш ненужни ре-рендери
const RealtorDashboard = memo(({ userId }: RealtorDashboardProps) => {
  const navigate = useNavigate();
  const [realtorData, setRealtorData] = useState<RealtorData | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  // Realtor dashboard shows only the "Diagnosis" part of the intro training.
  // (Keep original structure in code; we only filter/rename for this page.)
  const realtorTrainingStructure = (structure: TrainingSection[]): TrainingSection[] =>
    structure.map((section) => {
      if (section.id !== 'work-with-buyer') return section;
      return {
        ...section,
        title: 'Диагноза',
        subsections: section.subsections.filter((s) => s.id === 'diagnosis'),
      };
    });

  const [trainingData, setTrainingData] = useState<TrainingSection[]>(
    realtorTrainingStructure(trainingStructure)
  );
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [chatUserName, setChatUserName] = useState<string>('');
  const [currentTeam, setCurrentTeam] = useState<{
    leader: { id: string; name: string; level: string } | null;
    members: Array<{ id: string; name: string; level: string }>;
    teamName: string;
  } | null>(null);

  // Temporarily hide these sections until the next user instruction.
  // (Keep code in place; we only toggle visibility.)
  const hidePersonalGoals = true;
  const hideWeeklySchedule = true;
  const hideDeals = true;

  // Използвай ref за да предотвратиш повторно зареждане на данни
  const hasFetchedData = useRef(false);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    // Зареждай данни само ако userId се е променил или ако не е заредено преди
    if (userId && (userId !== previousUserId.current || !hasFetchedData.current)) {
      previousUserId.current = userId;
      hasFetchedData.current = true;
      fetchRealtorData();
    }
  }, [userId]);


  const fetchCurrentTeam = useCallback(async () => {
    try {
      if (!realtorData?.team_id) {
        setCurrentTeam(null);
        return;
      }

      const offices = await supabaseApi.getAllOfficesFull();
      
      for (const office of offices) {
        for (const team of office.teams || []) {
          if (team.id === realtorData.team_id) {
            const leader = team.leader ? {
              id: team.leader.id,
              name: formatNameWithEmoji(team.leader.full_name),
              level: team.leader.realtor?.level ? 
                (team.leader.realtor.level === 1 ? 'Чирак' : 
                 team.leader.realtor.level === 3 ? 'Реализатор' : 
                 team.leader.realtor.level === 5 ? 'Елит' : `Ниво ${team.leader.realtor.level}`) : 'Чирак'
            } : null;

            const members = (team.realtors || [])
              .filter((r: { user_id?: string; profile?: { id?: string } }) => {
                const realtorUserId = r.user_id || r.profile?.id;
                const leaderId = team.leader?.id;
                return realtorUserId !== leaderId;
              })
              .map((r: { id: string; level?: number; user_id?: string; profile?: { id?: string; full_name?: string } }) => ({
                id: r.id,
                name: formatNameWithEmoji(r.profile?.full_name || 'Неизвестен'),
                level: r.level ? 
                  (r.level === 1 ? 'Чирак' : 
                   r.level === 3 ? 'Реализатор' : 
                   r.level === 5 ? 'Елит' : `Ниво ${r.level}`) : 'Чирак',
                userId: r.user_id || r.profile?.id
              }));

            setCurrentTeam({
              leader,
              members,
              teamName: team.name
            });
            return;
          }
        }
      }
      
      setCurrentTeam(null);
    } catch (error) {
      console.error('❌ Error fetching current team from Prisma:', error);
      setCurrentTeam(null);
    }
  }, [realtorData?.team_id]);

  // Realtor dashboard currently does not render topology UI.
  // This function is kept as a safe placeholder to avoid runtime crashes
  // from legacy code that still calls `fetchTopologyData()`.
  const fetchTopologyData = useCallback(async () => {
    // no-op
  }, []);

  const fetchTrainingProgress = useCallback(async () => {
    try {
      if (!realtorData?.id) return;

      const progressData = await supabaseApi.getTrainingProgress();

      if (progressData && progressData.length > 0) {
        const updatedData = realtorTrainingStructure(trainingStructure).map((section) => ({
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
        const progress = calculateTrainingProgress(updatedData);
        setTrainingProgress(progress);
      } else {
        // If no progress data, use default (filtered) structure
        setTrainingData(realtorTrainingStructure(trainingStructure));
        setTrainingProgress(0);
      }
    } catch (error) {
      console.error('Error fetching training progress:', error);
      // On error, use default structure
      setTrainingData(realtorTrainingStructure(trainingStructure));
      setTrainingProgress(0);
    }
  }, [realtorData?.id]);

  useEffect(() => {
    if (realtorData?.id) {
      fetchTrainingProgress();
      fetchTopologyData();
      fetchCurrentTeam();
    }
  }, [
    realtorData?.id,
    realtorData?.user?.email,
    realtorData?.team_id,
    fetchTrainingProgress,
    fetchCurrentTeam,
    fetchTopologyData,
  ]);

  const fetchRealtorData = async () => {
    setLoading(true);
    
    try {
      console.log('📥 Fetching realtor profile from Supabase...');
      const realtorProfile = await supabaseApi.getCurrentRealtor();

      if (realtorProfile) {
        const realtorDataObj = {
          id: realtorProfile.id,
          level: realtorProfile.level,
          confidence: realtorProfile.confidence || false,
          salesResilience: realtorProfile.sales_resilience || false,
          successMindset: realtorProfile.success_mindset || false,
          team_id: realtorProfile.team_id,
          user: {
            fullName: realtorProfile.profile?.full_name || '',
            email: realtorProfile.profile?.email || ''
          }
        };
        setRealtorData(realtorDataObj);

        const [dealsData, diagnosesData] = await Promise.all([
          supabaseApi.getMyDeals(),
          supabaseApi.getMyDiagnoses()
        ]);

        setDeals(dealsData.map((deal: Record<string, unknown>) => ({
          id: deal.id,
          clientName: deal.clientName || deal.client_name,
          dealValue: Number(deal.dealValue || deal.deal_value || 0),
          dealDate: deal.dealDate || deal.deal_date,
          isKey: deal.isKey || deal.is_key || false,
          isExclusive: deal.isExclusive || deal.is_exclusive || false,
        })));

        setDiagnoses(diagnosesData.map((diagnosis: Record<string, unknown>) => ({
          id: diagnosis.id,
          clientName: diagnosis.clientName || diagnosis.client_name,
          status: diagnosis.status || 'active',
          diagnosisDate: diagnosis.diagnosisDate || diagnosis.diagnosis_date,
        })));
      }
    } catch (error) {
      console.error('Error fetching realtor data:', error);
      toast.error('Грешка при зареждане на данни');
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
    if (!realtorData?.id) return;

    // Update local state first
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
              
              // If exam is passed, automatically mark all other steps as completed
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
    setTrainingProgress(calculateTrainingProgress(updatedData));

    // Save to database
    try {
      const subsection = updatedData
        .find((s) => s.id === sectionId)
        ?.subsections.find((ss) => ss.id === subsectionId);

      if (subsection) {
        await supabaseApi.updateTrainingProgress({
          realtorId: realtorData.id,
          section: sectionId,
          subsection: subsectionId,
          lectureCompleted: subsection.progress.lecture,
          videoCompleted: subsection.progress.video,
          practicalCompleted: subsection.progress.practical,
          handoverCompleted: subsection.progress.handover,
          examCompleted: subsection.progress.exam,
        });

        // Show success message
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

  const handleOpenChat = (userId: string, userName: string) => {
    setChatUserId(userId);
    setChatUserName(userName);
    setChatOpen(true);
  };

  const handleLogout = async () => {
    await supabaseApi.logout();
    navigate('/auth');
  };

  const calculateSuccessRate = () => {
    if (diagnoses.length === 0) return 0;
    return Math.round((deals.length / diagnoses.length) * 100);
  };

  const getTotalDealValue = () => {
    return deals.reduce((sum, deal) => sum + deal.dealValue, 0);
  };

  const getCurrentKeys = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return deals.filter((deal) => {
      const dealDate = new Date(deal.dealDate);
      return (
        dealDate.getMonth() === currentMonth &&
        dealDate.getFullYear() === currentYear &&
        deal.isKey === true
      );
    }).length;
  };

  const getCurrentExclusives = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return deals.filter((deal) => {
      const dealDate = new Date(deal.dealDate);
      return (
        dealDate.getMonth() === currentMonth &&
        dealDate.getFullYear() === currentYear &&
        deal.isExclusive === true
      );
    }).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (!realtorData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground">Няма намерен профил на реализатор.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customNavbarContent = (
    <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4">
      <StatBadge
        icon={Users}
        value={diagnoses.length}
        title="Диагнози"
        colorScheme="blue"
      />
      <StatBadge
        icon={TrendingUp}
        value={deals.length}
        title="Сделки"
        colorScheme="green"
      />
      <StatBadge
        icon={BarChart3}
        value={`${calculateSuccessRate()}%`}
        title="Успеваемост"
        colorScheme="purple"
      />
    </div>
  );

  const completedSectionsCount = trainingData.filter((section) =>
    section.subsections.every(
      (subsection) =>
        subsection.progress.lecture &&
        subsection.progress.video &&
        subsection.progress.practical &&
        subsection.progress.handover &&
        subsection.progress.exam
    )
  ).length;
  const currentStage = Math.min(completedSectionsCount + 1, Math.max(trainingData.length, 1));
  const stageTitle = completedSectionsCount === trainingData.length && trainingData.length > 0
    ? 'Обучение - Завършено'
    : `Обучение - Етап ${currentStage}`;

  return (
      <AppLayout
        customNavbarContent={customNavbarContent}
                >
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Personal Goals */}
          {realtorData && (
            <div className={hidePersonalGoals ? 'hidden' : undefined}>
              <PersonalGoalsCard
                realtorId={realtorData.id}
                currentDeals={deals.length}
                currentKeys={getCurrentKeys()}
                currentExclusives={getCurrentExclusives()}
              />
            </div>
          )}

          {/* Weekly Buyer Schedule */}
          {realtorData && (
            <div className={hideWeeklySchedule ? 'hidden' : undefined}>
              <WeeklyBuyerSchedule realtorId={realtorData.id} />
            </div>
          )}

          {/* Team Section - Modern Design */}
          {currentTeam && (
            <Card className="border-2 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  ЕКИП
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Team Leader */}
                {currentTeam.leader && (
                  <div className="group p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-2 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600 transition-all duration-300 hover:shadow-md cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 group-hover:scale-110 transition-transform">
                          <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold truncate">Краси Кътев</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenChat(currentTeam.leader!.id, currentTeam.leader!.name)}
                        className="hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {currentTeam.members.length > 0 && (
                  <div className="space-y-2">
                    {currentTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className="group p-4 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-md cursor-pointer"
                        onClick={() => handleOpenChat((member as { userId?: string; id: string }).userId || member.id, member.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:scale-110 transition-transform">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{member.name}</div>
                              <div className="text-xs text-muted-foreground">{member.level}</div>
                            </div>
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Deals - Enhanced */}
          <div className={hideDeals ? 'hidden' : undefined}>
            <Card className="border-2 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Последни сделки
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deals.length > 0 ? (
                  <div className="space-y-3">
                    {deals.slice(0, 5).map((deal) => (
                      <div
                        key={deal.id}
                        className="group p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted hover:to-muted border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold break-words">{deal.clientName}</p>
                              {deal.isKey && (
                                <Badge variant="default" className="text-xs">Ключ</Badge>
                              )}
                              {deal.isExclusive && (
                                <Badge variant="secondary" className="text-xs">Ексклузив</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(deal.dealDate).toLocaleDateString('bg-BG', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-sm font-bold px-3 py-1">
                            {deal.dealValue.toLocaleString('bg-BG')} лв
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">Все още няма сделки за този месец</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Training Structure - Enhanced */}
          <div className="space-y-6">
            <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{stageTitle}</h3>
                    <div className="relative h-28 w-28 sm:h-32 sm:w-32">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                        <circle cx="60" cy="60" r="52" strokeWidth="10" className="stroke-muted/60 fill-none" />
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          strokeWidth="10"
                          className="stroke-primary fill-none transition-all duration-500 ease-out"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - trainingProgress / 100)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-primary/10 border border-primary/30 overflow-hidden flex items-center justify-center">
                          <img
                            src="https://rickandmortyapi.com/api/character/avatar/1.jpeg"
                            alt="Rick and Morty avatar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-background border border-primary/30 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-primary whitespace-nowrap">
                        Завършени {Math.round((trainingProgress / 100) * 17)} от 17
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div />
                      <div className="flex flex-col items-end gap-1.5 sm:max-w-[320px]">
                        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900 dark:text-slate-100 mb-1">
                          Лични качества
                        </p>
                        {[
                          { key: 'confidence', label: 'Увереност', active: realtorData.confidence },
                          { key: 'salesResilience', label: 'Търговски непукизъм', active: realtorData.salesResilience },
                          { key: 'successMindset', label: 'Успешен начин на мислене', active: realtorData.successMindset },
                        ].map((trait) => (
                          <div
                            key={trait.key}
                            className={cn(
                              "group cursor-default rounded-lg px-2 py-1 border transition-all duration-300",
                              "bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30",
                              trait.active
                                ? "opacity-100 shadow-sm"
                                : "opacity-50 saturate-0"
                            )}
                            title={trait.label}
                          >
                            <span className="text-[10px] sm:text-xs font-medium text-primary leading-none">
                              {trait.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {trainingData.map((section) => (
                <TrainingSectionCard
                  key={section.id}
                  section={section}
                  onProgressUpdate={() => {}}
                  editable={false} // Реализаторите само разглеждат собственото обучение
                />
              ))}
            </div>
          </div>
        </div>

        {/* Account Settings Dialog */}
        {realtorData && (
          <AccountSettingsDialog
            open={accountSettingsOpen}
            onOpenChange={setAccountSettingsOpen}
            userInfo={{
              fullName: realtorData.user.fullName,
              email: realtorData.user.email,
            }}
            onUpdate={async () => {
              try {
                const realtor = await supabaseApi.getCurrentRealtor();
                if (realtor) {
                  const { user } = await supabaseApi.getCurrentUser();
                  if (user) {
                    setRealtorData({
                      id: realtor.id,
                      level: realtor.level,
                      confidence: realtor.confidence || false,
                      salesResilience: realtor.sales_resilience || false,
                      successMindset: realtor.success_mindset || false,
                      team_id: realtor.team_id,
                      user: {
                        fullName: user.full_name || realtorData.user.fullName,
                        email: user.email || realtorData.user.email
                      }
                    });
                  }
                }
              } catch (error) {
                console.error('Error refetching realtor data:', error);
              }
            }}
          />
        )}

      {/* Chat Component */}
      {chatOpen && chatUserId && (
        <Chat
          userId={chatUserId}
          userName={chatUserName}
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatUserId(null);
            setChatUserName('');
          }}
        />
      )}
      </AppLayout>
  );
});

// Задай displayName за по-лесно дебъгване
RealtorDashboard.displayName = 'RealtorDashboard';

export default RealtorDashboard;
