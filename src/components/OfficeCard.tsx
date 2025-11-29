import { Card } from '@/components/ui/card';
import { Building2, MapPin, Users, TrendingUp, DollarSign } from 'lucide-react';
import { Office } from '@/types';
import { calculateOfficeMetrics, formatCurrency } from '@/utils/calculations';

interface OfficeCardProps {
  office: Office;
  onClick: () => void;
}

export const OfficeCard = ({ office, onClick }: OfficeCardProps) => {
  const metrics = calculateOfficeMetrics(office);

  return (
    <Card
      onClick={onClick}
      className="p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card border-border"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground mb-2">{office.name}</h3>
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{office.location}</span>
            </div>
            <div className="flex items-center gap-2 text-accent">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{metrics.totalEmployees} Реализатори</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Оборот</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(metrics.totalTurnover)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Чиста Печалба</span>
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(metrics.totalProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Средна цена на сделка</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(metrics.averageDealSize)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Сделки</p>
            <p className="text-sm font-semibold text-foreground">{metrics.totalDeals}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
