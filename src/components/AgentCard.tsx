import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Agent } from '@/types';
import { formatNameWithEmoji } from '@/utils/nameEmojis';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Чирак':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    case 'Реализатор':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'Елит':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const AgentCard = ({ agent, onClick }: AgentCardProps) => {
  const levelProgress = (agent.trainingStage / 5) * 100;

  return (
    <Card
      onClick={onClick}
      className="p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card border-border"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarImage src={agent.avatar} alt={agent.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {agent.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-foreground break-words">{formatNameWithEmoji(agent.name)}</h3>
              <p className="text-sm text-muted-foreground break-words">{agent.position}</p>
            </div>
            <Badge className={getLevelColor(agent.level)}>{agent.level}</Badge>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Прогрес на нивото</span>
                <span>{agent.level}</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Етап на обучение</span>
                <span>Етап {agent.trainingStage} от 5</span>
              </div>
              <Progress value={(agent.trainingStage / 5) * 100} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
