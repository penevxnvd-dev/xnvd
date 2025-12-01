import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, Target, TrendingUp } from 'lucide-react';
import { KPIMetrics, formatSuccessRate } from '@/utils/kpiCalculations';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OfficeCardProps {
  office: {
    id: string;
    name: string;
    address?: string | null;
  };
  metrics: KPIMetrics;
  onClick?: () => void;
}

export const OfficeCard = ({ office, metrics, onClick }: OfficeCardProps) => {
  const successRate = metrics.successRate;
  const maxValue = Math.max(metrics.deals, metrics.diagnoses, 1);
  
  return (
    <Card 
      className={cn(
        "group relative cursor-pointer overflow-hidden",
        "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:border-success/50",
        "shadow-sm"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-md bg-success/5 border border-success/20">
              <Building2 className="h-4.5 w-4.5 text-success" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-50 break-words flex-1">
                  {office.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex-shrink-0">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">{metrics.realtors}</span>
                </div>
              </div>
              {office.address && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{office.address}</p>
              )}
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
        <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
          {/* Stats Grid */}
          <div className="space-y-3">
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
          
          {/* Level Distribution - Game Style */}
          <div className="flex flex-col gap-3 pl-5 border-l border-gray-200 dark:border-gray-800">
            <div className="space-y-2.5">
              {/* Елит Level */}
              <div className="relative">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                    Елит
                  </span>
                  <Badge className="text-sm px-3 py-1 font-bold bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md shadow-red-500/30">
                    {(metrics.levelDistribution[4] || 0) + (metrics.levelDistribution[5] || 0)}
                  </Badge>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.realtors > 0 ? (((metrics.levelDistribution[4] || 0) + (metrics.levelDistribution[5] || 0)) / metrics.realtors) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Реализатор Level */}
              <div className="relative">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Реализатор
                  </span>
                  <Badge className="text-sm px-3 py-1 font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md shadow-blue-500/30">
                    {(metrics.levelDistribution[2] || 0) + (metrics.levelDistribution[3] || 0)}
                  </Badge>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.realtors > 0 ? (((metrics.levelDistribution[2] || 0) + (metrics.levelDistribution[3] || 0)) / metrics.realtors) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Чирак Level */}
              <div className="relative">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">
                    Чирак
                  </span>
                  <Badge className="text-sm px-3 py-1 font-bold bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md shadow-green-500/30">
                    {metrics.levelDistribution[1] || 0}
                  </Badge>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.realtors > 0 ? ((metrics.levelDistribution[1] || 0) / metrics.realtors) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
