import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';
import { KPIMetrics, formatSuccessRate, formatDealValue } from '@/utils/kpiCalculations';
import { Badge } from '@/components/ui/badge';

interface KPICardProps {
  metrics: KPIMetrics;
  title?: string;
}

export const KPICard = ({ metrics, title }: KPICardProps) => {
  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium">Реализатори</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{metrics.realtors}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Общ брой</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium">Сделки</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{metrics.deals}</div>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">
              За месеца • {formatDealValue(metrics.totalDealValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium">Диагнози</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{metrics.diagnoses}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Активни запитвания</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium">Успеваемост</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatSuccessRate(metrics.successRate)}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Сделки / Диагнози</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(metrics.levelDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Разпределение по нива</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.levelDistribution)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([level, count]) => (
                  <Badge key={level} variant="secondary" className="text-sm">
                    Ниво {level}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

