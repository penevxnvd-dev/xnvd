import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Target, TrendingUp } from 'lucide-react';
import { KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CountryCardProps {
  country: {
    id: string;
    name: string;
    code: string;
  };
  metrics: KPIMetrics;
  onClick?: () => void;
}

export const CountryCard = ({ country, metrics, onClick }: CountryCardProps) => {
  const successRate = metrics.successRate;
  const maxValue = Math.max(metrics.realtors, metrics.deals, metrics.diagnoses, 1);
  
  return (
    <Card 
      className={cn(
        "group relative cursor-pointer overflow-hidden",
        "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:border-primary/50",
        "shadow-sm"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl sm:text-3xl">🇧🇬</span>
            <div className="flex-1">
              <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-50 break-words">
                {country.name}
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">Код: {country.code}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 flex-shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {formatSuccessRate(successRate)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Realtors */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/30">
                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Реализатори
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{metrics.realtors}</p>
            <Progress 
              value={(metrics.realtors / maxValue) * 100} 
              className="h-1 bg-gray-100 dark:bg-gray-800"
            />
          </div>

          {/* Diagnoses */}
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
            <Progress 
              value={(metrics.diagnoses / maxValue) * 100} 
              className="h-1 bg-gray-100 dark:bg-gray-800"
            />
          </div>

          {/* Deals */}
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
            <Progress 
              value={(metrics.deals / maxValue) * 100} 
              className="h-1 bg-gray-100 dark:bg-gray-800"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
