import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Agent } from '@/types';
import { Trophy, Award, Medal } from 'lucide-react';
import { formatCurrency } from '@/utils/calculations';
import { formatNameWithEmoji } from '@/utils/nameEmojis';

interface LeaderboardCardProps {
  agents: Agent[];
  title: string;
  sortBy: 'profit' | 'deals';
  limit?: number;
}

export const LeaderboardCard = ({ agents, title, sortBy, limit = 5 }: LeaderboardCardProps) => {
  const sorted = [...agents].sort((a, b) => {
    if (sortBy === 'profit') {
      const profitA = a.deals.reduce((sum, deal) => sum + deal.netProfit, 0);
      const profitB = b.deals.reduce((sum, deal) => sum + deal.netProfit, 0);
      return profitB - profitA;
    } else {
      return b.deals.length - a.deals.length;
    }
  }).slice(0, limit);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="text-muted-foreground font-semibold">{index + 1}</span>;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {sorted.map((agent, index) => {
          const profit = agent.deals.reduce((sum, deal) => sum + deal.netProfit, 0);
          const dealCount = agent.deals.length;
          
          return (
            <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(index)}
              </div>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={agent.avatar} alt={agent.name} />
                <AvatarFallback className="text-xs">
                  {agent.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{formatNameWithEmoji(agent.name)}</p>
                <p className="text-xs text-muted-foreground">{agent.department}</p>
              </div>
              <div className="text-right">
                {sortBy === 'profit' ? (
                  <>
                    <p className="font-bold text-success">{formatCurrency(profit)}</p>
                    <p className="text-xs text-muted-foreground">{dealCount} deals</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-foreground">{dealCount} deals</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(profit)}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
