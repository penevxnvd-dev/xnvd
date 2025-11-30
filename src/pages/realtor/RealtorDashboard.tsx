import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LogOut, TrendingUp, Users, Target, CheckCircle2, XCircle, BookOpen, Calendar } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { trainingStructure, calculateTrainingProgress, TrainingSection } from '@/data/trainingStructure';
import { TrainingSectionCard } from '@/components/cards/TrainingSectionCard';
import { toast } from 'sonner';

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainingData, setTrainingData] = useState<TrainingSection[]>(trainingStructure);
  const [trainingProgress, setTrainingProgress] = useState(0);

  useEffect(() => {
    fetchRealtorData();
  }, [userId]);

  useEffect(() => {
    if (realtorData?.id) {
      fetchTrainingProgress();
    }
  }, [realtorData?.id]);

  const fetchRealtorData = async () => {
    setLoading(true);
    
    try {
      // Fetch realtor profile
      const realtorProfile = await supabaseApi.getCurrentRealtor();

      if (realtorProfile) {
        setRealtorData({
          id: realtorProfile.id,
          level: realtorProfile.level,
          confidence: realtorProfile.confidence || false,
          salesResilience: realtorProfile.salesResilience || false,
          successMindset: realtorProfile.successMindset || false,
          user: {
            fullName: realtorProfile.user.fullName,
            email: realtorProfile.user.email
          }
        });

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
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <span className="text-sm font-medium">{label}</span>
      {active ? (
        <CheckCircle2 className="h-5 w-5 text-success" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive" />
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {realtorData.user.fullName}
                </h1>
                <p className="text-xs text-muted-foreground">Ниво {realtorData.level}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/training-calendar')} variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Календар
              </Button>
              <Button onClick={() => navigate('/training')} variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Обучение
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Сделки този месец</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deals.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Обща стойност: {getTotalDealValue().toLocaleString()} лв
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Диагнози</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{diagnoses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Активни запитвания
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Успеваемост</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateSuccessRate()}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Сделки / Диагнози
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personal Qualities */}
        <Card>
          <CardHeader>
            <CardTitle>Личностни качества</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QualityIndicator active={realtorData.confidence} label="Увереност" />
            <QualityIndicator active={realtorData.salesResilience} label="Търговски непукизъм" />
            <QualityIndicator active={realtorData.successMindset} label="Успешен начин на мислене" />
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <CardTitle>Последни сделки</CardTitle>
          </CardHeader>
          <CardContent>
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.slice(0, 5).map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{deal.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(deal.dealDate).toLocaleDateString('bg-BG')}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {deal.dealValue.toLocaleString()} лв
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Все още няма сделки за този месец
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Diagnoses */}
        <Card>
          <CardHeader>
            <CardTitle>Последни диагнози</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnoses.length > 0 ? (
              <div className="space-y-3">
                {diagnoses.slice(0, 5).map((diagnosis) => (
                  <div
                    key={diagnosis.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{diagnosis.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(diagnosis.diagnosisDate).toLocaleDateString('bg-BG')}
                      </p>
                    </div>
                    <Badge>{diagnosis.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Все още няма диагнози за този месец
              </p>
            )}
          </CardContent>
        </Card>

        {/* Training Structure */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Обучение - Етап 1
                </CardTitle>
                <Badge variant="secondary" className="text-lg">
                  {trainingProgress}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={trainingProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
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
    </div>
  );
};

export default RealtorDashboard;