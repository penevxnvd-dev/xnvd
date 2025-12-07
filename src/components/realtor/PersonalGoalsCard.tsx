import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Edit2, Save, X, TrendingUp, Key, Star, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PersonalGoalsCardProps {
  realtorId: string;
  currentDeals: number;
  currentKeys: number;
  currentExclusives: number;
}

interface Goals {
  month: number;
  year: number;
  dealsGoal: number;
  keysGoal: number;
  exclusivesGoal: number;
}

export const PersonalGoalsCard = ({
  realtorId,
  currentDeals,
  currentKeys,
  currentExclusives,
}: PersonalGoalsCardProps) => {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    dealsGoal: 0,
    keysGoal: 0,
    exclusivesGoal: 0,
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMyGoals(currentMonth, currentYear);
      setGoals(data);
      setFormData({
        dealsGoal: data.dealsGoal || 0,
        keysGoal: data.keysGoal || 0,
        exclusivesGoal: data.exclusivesGoal || 0,
      });
    } catch (error: unknown) {
      console.error('Error fetching goals:', error);
      toast.error('Грешка при зареждане на целите');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await api.setMyGoals(
        currentMonth,
        currentYear,
        formData.dealsGoal,
        formData.keysGoal,
        formData.exclusivesGoal
      );
      setGoals(updated);
      setIsEditing(false);
      toast.success('Целите са запазени успешно');
    } catch (error: unknown) {
      console.error('Error saving goals:', error);
      toast.error('Грешка при запазване на целите');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (goals) {
      setFormData({
        dealsGoal: goals.dealsGoal || 0,
        keysGoal: goals.keysGoal || 0,
        exclusivesGoal: goals.exclusivesGoal || 0,
      });
    }
    setIsEditing(false);
  };

  const calculateProgress = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const monthNames = [
    'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
    'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
  ];

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Зареждане на цели...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const GoalItem = ({ 
    icon: Icon, 
    label, 
    current, 
    goal, 
    isEditing, 
    value, 
    onChange,
    gradientFrom,
    gradientTo,
    iconBg,
    iconColor,
    borderColor
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    current: number;
    goal: number;
    isEditing: boolean;
    value: number;
    onChange: (value: number) => void;
    gradientFrom: string;
    gradientTo: string;
    iconBg: string;
    iconColor: string;
    borderColor: string;
  }) => {
    const progress = calculateProgress(current, goal || 1);
    const isComplete = progress >= 100;
    
    return (
      <div className={cn(
        "group relative overflow-hidden rounded-xl border-2 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        isComplete 
          ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 dark:border-green-700" 
          : `bg-gradient-to-br ${gradientFrom} ${gradientTo} hover:${borderColor}`,
        "p-4 sm:p-5"
      )}>
        {/* Completion Badge */}
        {isComplete && (
          <div className="absolute top-2 right-2">
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "p-2 sm:p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110",
              iconBg
            )}>
              <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <Label className="text-sm sm:text-base font-semibold text-foreground block">
                {label}
              </Label>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                {monthNames[currentMonth - 1]} {currentYear}
              </div>
            </div>
          </div>
          
          {isEditing ? (
            <Input
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(parseInt(e.target.value) || 0)}
              className="w-20 h-9 text-center text-base font-semibold border-2 focus:border-primary"
            />
          ) : (
            <div className="text-right">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{goal || 0}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">цел</div>
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{current}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">от {goal || 0}</span>
            </div>
            <Badge 
              variant={isComplete ? "default" : "secondary"}
              className={cn(
                "text-xs font-bold px-2 py-0.5",
                isComplete && "bg-green-500 text-white"
              )}
            >
              {progress}%
            </Badge>
          </div>
          <Progress
            value={progress}
            className={cn(
              "h-2",
              isComplete ? "bg-green-200 dark:bg-green-900/30" : ""
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2 hover:shadow-xl transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
        <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold">Лични цели</span>
        </CardTitle>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="hover:bg-primary/10 hover:border-primary transition-colors"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Редактирай</span>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="hover:bg-green-600 transition-colors bg-green-500"
            >
              {saving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Запази</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <GoalItem
            icon={TrendingUp}
            label="Сделки"
            current={currentDeals}
            goal={goals?.dealsGoal || 0}
            isEditing={isEditing}
            value={formData.dealsGoal}
            onChange={(val) => setFormData({ ...formData, dealsGoal: val })}
            gradientFrom="from-blue-50"
            gradientTo="to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            borderColor="border-blue-400"
          />
          
          <GoalItem
            icon={Key}
            label="Ключове"
            current={currentKeys}
            goal={goals?.keysGoal || 0}
            isEditing={isEditing}
            value={formData.keysGoal}
            onChange={(val) => setFormData({ ...formData, keysGoal: val })}
            gradientFrom="from-yellow-50"
            gradientTo="to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20"
            iconBg="bg-yellow-100 dark:bg-yellow-900/30"
            iconColor="text-yellow-600 dark:text-yellow-400"
            borderColor="border-yellow-400"
          />
          
          <GoalItem
            icon={Star}
            label="Ексклузиви"
            current={currentExclusives}
            goal={goals?.exclusivesGoal || 0}
            isEditing={isEditing}
            value={formData.exclusivesGoal}
            onChange={(val) => setFormData({ ...formData, exclusivesGoal: val })}
            gradientFrom="from-purple-50"
            gradientTo="to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            borderColor="border-purple-400"
          />
        </div>
      </CardContent>
    </Card>
  );
};
