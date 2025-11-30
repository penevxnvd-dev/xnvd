import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, TrendingUp, DollarSign } from 'lucide-react';
import { TeamLeader } from '@/types';
import { calculateLeaderMetrics, formatCurrency } from '@/utils/calculations';
import { formatNameWithEmoji } from '@/utils/nameEmojis';

interface TeamLeaderCardProps {
  leader: TeamLeader;
  onClick: () => void;
}

export const TeamLeaderCard = ({ leader, onClick }: TeamLeaderCardProps) => {
  const metrics = calculateLeaderMetrics(leader);

  return (
    <Card
      onClick={onClick}
      className="p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card border-border"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={leader.avatar} alt={leader.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {leader.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{formatNameWithEmoji(leader.name)}</h3>
            <p className="text-sm text-muted-foreground mb-2">{leader.position}</p>
            <div className="flex items-center gap-2 text-accent">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{leader.teamMembers.length} Членове на екипа</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Оборот на екипа</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {formatCurrency(metrics.totalTurnover)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Нета печалба</span>
            </div>
            <p className="text-base font-bold text-success">
              {formatCurrency(metrics.totalProfit)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
