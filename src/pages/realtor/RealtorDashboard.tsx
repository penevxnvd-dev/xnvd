import { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { Settings } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LogOut, TrendingUp, Users, Target, CheckCircle2, XCircle, BookOpen, Calendar, ChevronDown, Menu } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { TopologySidebar } from '@/components/TopologySidebar';
import { transformOffices } from '@/utils/dataTransform';
import { Office, Agent } from '@/types';
import { toast } from 'sonner';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';

interface RealtorData {
  id: string;
  level: number;
  confidence: boolean;
  salesResilience: boolean;
  successMindset: boolean;
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

  useEffect(() => {
    fetchRealtorData();
  }, [userId]);

  useEffect(() => {
    if (realtorData?.id) {
      fetchTrainingProgress();
      fetchTopologyData();
    }
  }, [realtorData?.id, realtorData?.user?.email]);

  const fetchTopologyData = async () => {
    try {
      const dbOffices = await supabaseApi.getAllOfficesFull();
      const transformedOffices = transformOffices(dbOffices);
      setTopologyOffices(transformedOffices);
      
      // Find and select current realtor in topology by user email
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

  const fetchRealtorData = async () => {
    setLoading(true);
    
    try {
      // Fetch realtor profile
      const realtorProfile = await supabaseApi.getCurrentRealtor();

      if (realtorProfile) {
        const realtorDataObj = {
          id: realtorProfile.id,
          level: realtorProfile.level,
          confidence: realtorProfile.confidence || false,
          salesResilience: realtorProfile.salesResilience || false,
          successMindset: realtorProfile.successMindset || false,
          user: {
            fullName: realtorProfile.user.fullName,
            email: realtorProfile.user.email
          }
        };
        setRealtorData(realtorDataObj);

        // Fetch deals and diagnoses
        const [dealsData, diagnosesData] = await Promise.all([
          supabaseApi.getMyDeals(),
          supabaseApi.getMyDiagnoses()
        ]);

        setDeals(dealsData.map((deal: any) => ({
          id: deal.id,
          clientName: deal.client_name,
          dealValue: Number(deal.deal_value),
          dealDate: deal.deal_date
        })));

        setDiagnoses(diagnosesData.map((diag: any) => ({
          id: diag.id,
          clientName: diag.client_name,
          status: diag.status,
          diagnosisDate: diag.diagnosis_date
        })));
      }
    } catch (error) {
      console.error('Error fetching realtor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingProgress = async () => {
    if (!realtorData?.id) return;

    try {
      const progressData = await supabaseApi.getTrainingProgress();

      if (progressData) {
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
    if (!realtorData?.id) return;

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
    setTrainingProgress(calculateTrainingProgress(updatedData));

    try {
      const subsection = updatedData
        .find((s) => s.id === sectionId)
        ?.subsections.find((ss) => ss.id === subsectionId);

      if (subsection) {
        await supabaseApi.updateTrainingProgress({
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

  const QualityIndicator = ({ active, label }: { active: boolean; label: string }) => (
    <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
      <span className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{label}</span>
      {active ? (
        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0 ml-2" />
      ) : (
        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0 ml-2" />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
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
    <div className="min-h-screen bg-background flex">
      <TopologySidebar
        offices={topologyOffices}
        selectedAgentId={selectedAgentId || undefined}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 sm:p-2 flex-shrink-0"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              >
                <img src={logo} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain" />
              </button>
              <div className="min-w-0 flex-1">
                {(() => {
                  const { displayName } = formatNameWithoutElevenEleven(realtorData.user.fullName);
                  return (
                    <h1 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold text-foreground break-words">
                      {displayName}
                    </h1>
                  );
                })()}
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Ниво {realtorData.level}</p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              <Button onClick={() => navigate('/training-calendar')} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Календар</span>
              </Button>
              <Button onClick={() => navigate('/training-progress')} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Обучение</span>
              </Button>
              <Button onClick={() => navigate('/training-progress')} variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>Отбелязване</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-[10px] sm:text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${realtorData.user.email}`} />
                        <AvatarFallback className="text-[9px] sm:text-[10px] md:text-xs">
                          {realtorData.user.fullName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {(() => {
                        const { displayName } = formatNameWithoutElevenEleven(realtorData.user.fullName);
                        return (
                          <span className="break-words max-w-[100px] sm:max-w-[150px] md:max-w-none">{displayName}</span>
                        );
                      })()}
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      {(() => {
                        const { displayName } = formatNameWithoutElevenEleven(realtorData.user.fullName);
                        return (
                          <p className="text-sm font-medium">{displayName}</p>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">{realtorData.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Роля: Реализатор • Ниво: {realtorData.level}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Настройки на акаунта
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Изход
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium break-words">Сделки този месец</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{deals.length}</div>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 break-words">
                Обща стойност: {getTotalDealValue().toLocaleString()} лв
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium break-words">Диагнози</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{diagnoses.length}</div>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 break-words">
                Активни запитвания
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium break-words">Успеваемост</CardTitle>
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{calculateSuccessRate()}%</div>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 break-words">
                Сделки / Диагнози
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personal Qualities */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base break-words">Личностни качества</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
            <QualityIndicator active={realtorData.confidence} label="Увереност" />
            <QualityIndicator active={realtorData.salesResilience} label="Търговски непукизъм" />
            <QualityIndicator active={realtorData.successMindset} label="Успешен начин на мислене" />
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base break-words">Последни сделки</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {deals.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {deals.slice(0, 5).map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{deal.clientName}</p>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                        {new Date(deal.dealDate).toLocaleDateString('bg-BG')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0">
                      {deal.dealValue.toLocaleString()} лв
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground text-center py-4 break-words">
                Все още няма сделки за този месец
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Diagnoses */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base break-words">Последни диагнози</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {diagnoses.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {diagnoses.slice(0, 5).map((diagnosis) => (
                  <div
                    key={diagnosis.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs md:text-sm font-medium break-words">{diagnosis.clientName}</p>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                        {new Date(diagnosis.diagnosisDate).toLocaleDateString('bg-BG')}
                      </p>
                    </div>
                    <Badge className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0">{diagnosis.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground text-center py-4 break-words">
                Все още няма диагнози за този месец
              </p>
            )}
          </CardContent>
        </Card>

        {/* Training Structure */}
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm lg:text-base break-words">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <span>Обучение - Етап 1</span>
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm lg:text-base flex-shrink-0">
                  {trainingProgress}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <Progress value={trainingProgress} className="h-2 sm:h-3" />
              <p className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-1.5 sm:mt-2 break-words">
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
          onUpdate={async () => {
            // Refetch realtor data
            try {
              const realtor = await supabaseApi.getCurrentRealtor();
              if (realtor) {
                const { user } = await supabaseApi.getCurrentUser();
                if (user) {
                  const profile = await supabaseApi.supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();
                  
                  setRealtorData({
                    ...realtor,
                    user: {
                      fullName: profile.data?.full_name || realtorData.user.fullName,
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
    </div>
  );
};

export default RealtorDashboard;