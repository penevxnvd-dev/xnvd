import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { Settings, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LogOut, TrendingUp, Users, Target, CheckCircle2, XCircle, BookOpen, Menu, Zap, Award, BarChart3 } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { TopologySidebar } from '@/components/TopologySidebar';
import { transformOffices } from '@/utils/dataTransform';
import { Office, Agent } from '@/types';
import { toast } from 'sonner';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';
import { PersonalGoalsCard } from '@/components/realtor/PersonalGoalsCard';
import { WeeklyBuyerSchedule } from '@/components/realtor/WeeklyBuyerSchedule';
import { Chat } from '@/components/Chat';
import { Crown, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const RealtorDashboard = ({ userId }: RealtorDashboardProps) => {
  const navigate = useNavigate();
  const [realtorData, setRealtorData] = useState<RealtorData | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [topologyOffices, setTopologyOffices] = useState<Office[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [chatUserName, setChatUserName] = useState<string>('');
  const [currentTeam, setCurrentTeam] = useState<{
    leader: { id: string; name: string; level: string } | null;
    members: Array<{ id: string; name: string; level: string }>;
    teamName: string;
  } | null>(null);

  useEffect(() => {
    fetchRealtorData();
  }, [userId]);

  useEffect(() => {
    if (realtorData?.id) {
      fetchTrainingProgress();
      fetchTopologyData();
      fetchCurrentTeam();
    }
  }, [realtorData?.id, realtorData?.user?.email, realtorData?.team_id]);

  const fetchTopologyData = async () => {
    try {
      console.log('📥 Fetching topology data from Supabase...');
      const dbOffices = await supabaseApi.getAllOfficesFull();
      console.log(`✅ Loaded ${dbOffices.length} offices from Supabase`);
      const transformedOffices = transformOffices(dbOffices);
      setTopologyOffices(transformedOffices);
      
      if (realtorData?.user?.email) {
        for (const office of transformedOffices) {
          for (const leader of office.teamLeaders) {
            const agent = leader.teamMembers.find((a: Agent) => a.email === realtorData.user.email);
            if (agent) {
              setSelectedAgentId(agent.id);
              break;
            }
          }
          if (selectedAgentId) break;
        }
      }
    } catch (error) {
      console.error('Error fetching topology data:', error);
    }
  };

  const fetchCurrentTeam = async () => {
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
              .filter((r: any) => {
                const realtorUserId = r.user_id || r.profile?.id;
                const leaderId = team.leader?.id;
                return realtorUserId !== leaderId;
              })
              .map((r: any) => ({
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
  };

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

        setDeals(dealsData.map((deal: any) => ({
          id: deal.id,
          clientName: deal.clientName || deal.client_name,
          dealValue: Number(deal.dealValue || deal.deal_value || 0),
          dealDate: deal.dealDate || deal.deal_date,
          isKey: deal.isKey || deal.is_key || false,
          isExclusive: deal.isExclusive || deal.is_exclusive || false,
        })));

        setDiagnoses(diagnosesData.map((diagnosis: any) => ({
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

  const fetchTrainingProgress = async () => {
    try {
      if (!realtorData?.id) return;

      const progressData = await supabaseApi.getTrainingProgress();

      if (progressData && progressData.length > 0) {
        const updatedData = trainingStructure.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) => {
            const progressItem = progressData.find(
              (p: any) => p.section === section.id && p.subsection === subsection.id
            );
            return {
              ...subsection,
              progress: progressItem
                ? {
                    lecture: progressItem.lecture_completed || false,
                    video: progressItem.video_completed || false,
                    practical: progressItem.practical_completed || false,
                    handover: progressItem.handover_completed || false,
                    exam: progressItem.exam_completed || false,
                  }
                : subsection.progress,
            };
          }),
        }));

        setTrainingData(updatedData);
        setTrainingProgress(calculateTrainingProgress(updatedData));
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
    try {
      const fieldMap: Record<string, string> = {
        lecture: 'lecture_completed',
        video: 'video_completed',
        practical: 'practical_completed',
        handover: 'handover_completed',
        exam: 'exam_completed',
      };
      await supabaseApi.updateTrainingProgress({
        section: sectionId,
        subsection: subsectionId,
        [fieldMap[field]]: checked,
      });

      setTrainingData((prev) => {
        const updated = prev.map((section) => {
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
        setTrainingProgress(calculateTrainingProgress(updated));
        return updated;
      });

      toast.success('Прогресът е обновен');
    } catch (error: any) {
      console.error(error);
      toast.error('Грешка при обновяване на прогреса');
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

  const QualityIndicator = ({ active, label }: { active: boolean; label: string }) => (
    <div className={cn(
      "flex items-center justify-between p-3 sm:p-4 rounded-xl transition-all duration-300",
      "bg-gradient-to-r border",
      active 
        ? "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md" 
        : "from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
    )}>
      <span className="text-xs sm:text-sm font-medium break-words">{label}</span>
      {active ? (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        </div>
      ) : (
        <XCircle className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      )}
    </div>
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex">
      <TopologySidebar
        offices={topologyOffices}
        selectedAgentId={selectedAgentId || undefined}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onChatClick={handleOpenChat}
        mode="realtor"
      />
      
      <div className="flex-1 flex flex-col">
        {/* Modern Header with Gradient and Statistics */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-card/80 border-b border-border/50 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            {/* Top Row - Logo, Name, Statistics (center), Settings */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-accent/50 transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="hover:opacity-80 transition-all hover:scale-105 cursor-pointer"
                >
                  <img src={logo} alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
                </button>
                <div className="min-w-0">
                  {(() => {
                    const { displayName } = formatNameWithoutElevenEleven(realtorData.user.fullName);
                    return (
                      <div className="flex items-center gap-2">
                        <h1 className="text-sm sm:text-base lg:text-lg font-bold text-foreground break-words">
                          {displayName}
                        </h1>
                        <Badge variant="secondary" className="text-xs">
                          Ниво {realtorData.level}
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Statistics - Center with modern design */}
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 justify-center">
                {/* Диагнози */}
                <div className="group relative flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-md hover:scale-105">
                  <div className="p-1.5 rounded-md bg-blue-500/20 dark:bg-blue-500/30 group-hover:bg-blue-500/30 dark:group-hover:bg-blue-500/40 transition-colors">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 leading-tight">{diagnoses.length}</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight font-medium">Диагнози</div>
                  </div>
                </div>

                {/* Сделки */}
                <div className="group relative flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-200/50 dark:border-green-800/50 hover:border-green-400 dark:hover:border-green-600 transition-all duration-300 hover:shadow-md hover:scale-105">
                  <div className="p-1.5 rounded-md bg-green-500/20 dark:bg-green-500/30 group-hover:bg-green-500/30 dark:group-hover:bg-green-500/40 transition-colors">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-green-700 dark:text-green-300 leading-tight">{deals.length}</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight font-medium">Сделки</div>
                  </div>
                </div>

                {/* Успеваемост */}
                <div className="group relative flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-md hover:scale-105">
                  <div className="p-1.5 rounded-md bg-purple-500/20 dark:bg-purple-500/30 group-hover:bg-purple-500/30 dark:group-hover:bg-purple-500/40 transition-colors">
                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-300 leading-tight">{calculateSuccessRate()}%</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight font-medium">Успеваемост</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAccountSettingsOpen(true)}
                  className="hover:bg-accent/50 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Настройки</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Personal Goals */}
          {realtorData && (
            <PersonalGoalsCard
              realtorId={realtorData.id}
              currentDeals={deals.length}
              currentKeys={getCurrentKeys()}
              currentExclusives={getCurrentExclusives()}
            />
          )}

          {/* Weekly Buyer Schedule */}
          {realtorData && (
            <WeeklyBuyerSchedule realtorId={realtorData.id} />
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
                        onClick={() => handleOpenChat((member as any).userId || member.id, member.name)}
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

          {/* Personal Qualities - Enhanced */}
          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Личностни качества
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QualityIndicator active={realtorData.confidence} label="Увереност" />
              <QualityIndicator active={realtorData.salesResilience} label="Търговски непукизъм" />
              <QualityIndicator active={realtorData.successMindset} label="Успешен начин на мислене" />
            </CardContent>
          </Card>

          {/* Recent Deals - Enhanced */}
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
                              year: 'numeric' 
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

          {/* Training Structure - Enhanced */}
          <div className="space-y-6">
            <Card className="border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span>Обучение - Етап 1</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {trainingProgress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={trainingProgress} className="h-3 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Завършени {Math.round((trainingProgress / 100) * 17)} от 17 подточки
                </p>
              </CardContent>
            </Card>

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
          </div>
        </main>

        {/* Account Settings Dialog */}
        {realtorData && (
          <AccountSettingsDialog
            open={accountSettingsOpen}
            onOpenChange={setAccountSettingsOpen}
            userInfo={{
              fullName: realtorData.user.fullName,
              email: realtorData.user.email,
            }}
            onLogout={handleLogout}
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
      </div>

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
    </div>
  );
};

export default RealtorDashboard;
