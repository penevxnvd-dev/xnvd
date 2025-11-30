import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Target, CheckCircle2, XCircle, Award, TrendingUp } from 'lucide-react';
import { KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNameWithoutElevenEleven } from '@/utils/nameEmojis';

interface RealizatorCardProps {
  realtor: {
    id: string;
    name: string;
    email: string;
    level: number;
    confidence?: boolean;
    salesResilience?: boolean;
    successMindset?: boolean;
    avatar?: string;
  };
  metrics: KPIMetrics;
  onClick?: () => void;
}

const levelMap: Record<number, string> = {
  1: 'Чирак',
  2: 'Реализатор',
  3: 'Реализатор',
  4: 'Елит',
  5: 'Елит'
};

const getLevelColor = (level: number) => {
  switch (level) {
    case 1:
      return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 2:
    case 3:
      return 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
    case 4:
    case 5:
      return 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  }
};

export const RealizatorCard = ({ realtor, metrics, onClick }: RealizatorCardProps) => {
  const level = levelMap[realtor.level] || 'Чирак';
  const qualitiesCount = [realtor.confidence, realtor.salesResilience, realtor.successMindset].filter(Boolean).length;
  
  // Extract "11:11" from the name and format it
  const { displayName, shouldShowElevenEleven } = formatNameWithoutElevenEleven(realtor.name);
  
  return (
    <Card 
      className={cn(
        "group relative cursor-pointer overflow-hidden",
        "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg",
        realtor.level === 1 && "hover:border-blue-500/50",
        (realtor.level === 2 || realtor.level === 3) && "hover:border-green-500/50",
        (realtor.level === 4 || realtor.level === 5) && "hover:border-orange-500/50",
        "shadow-sm"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 flex-wrap">
            <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-50 break-words flex-1 min-w-0">
              {displayName}
            </CardTitle>
            <Badge className={cn("text-[9px] sm:text-[10px] md:text-xs border font-medium flex-shrink-0", getLevelColor(realtor.level))}>
              {level === 'Елит' && <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
              {level}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {shouldShowElevenEleven && (
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
                11:11
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {formatSuccessRate(metrics.successRate)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/30">
                <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Диагнози
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{metrics.diagnoses}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-green-50 dark:bg-green-950/30">
                <FileText className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Сделки
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{metrics.deals}</p>
          </div>
        </div>

        {/* Qualities */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Лични качества
            </span>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-50">{qualitiesCount}/3</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-700 dark:text-gray-300">Увереност</span>
              {realtor.confidence ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-700 dark:text-gray-300">Търговски непукизъм</span>
              {realtor.salesResilience ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-700 dark:text-gray-300">Успешен начин на мислене</span>
              {realtor.successMindset ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
