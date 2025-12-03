import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Agent } from '@/types';
import { Mail, Phone, Building2, Calendar, TrendingUp, Award, Download, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { DealTrendChart } from './charts/DealTrendChart';
import { getAllAgents, rankAgentsByProfit, rankAgentsByDeals, getAgentRank, formatCurrency } from '@/utils/calculations';
import { mockOffices } from '@/data/mockData';

interface AgentDetailDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const AgentDetailDialog = ({ agent, open, onOpenChange }: AgentDetailDialogProps) => {
  if (!agent) return null;

  const totalDeals = agent.deals.length;
  const totalTurnover = agent.deals.reduce((sum, deal) => sum + deal.dealValue, 0);
  const totalProfit = agent.deals.reduce((sum, deal) => sum + deal.netProfit, 0);
  const averageDealSize = totalDeals > 0 ? totalTurnover / totalDeals : 0;

  const allAgents = getAllAgents(mockOffices);
  const rankedByProfit = rankAgentsByProfit(allAgents);
  const rankedByDeals = rankAgentsByDeals(allAgents);
  const profitRank = getAgentRank(agent, rankedByProfit);
  const dealsRank = getAgentRank(agent, rankedByDeals);

  const exportToCSV = () => {
    const headers = ['Дата', 'Клиент', 'Депозит', 'Стойност на сделката', 'Разходи', 'Печалба'];
    const rows = agent.deals.map((deal) => [
      deal.date,
      deal.client,
      deal.deposit.toString(),
      deal.dealValue.toString(),
      (deal.expenses || 0).toString(),
      deal.netProfit.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${agent.name.replace(/\s+/g, '_')}_deals.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV файлът беше експортиран успешно');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Данни за агент</DialogTitle>
          <DialogDescription className="sr-only">
            Подробна информация за агента, включително статистика, сделки и постижения.
          </DialogDescription>
          <div className="flex items-start gap-4 pt-2">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={agent.avatar} alt={agent.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {agent.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{agent.name}</h2>
              <p className="text-muted-foreground">{agent.position}</p>
              <div className="flex gap-2 mt-2">
                <Badge className={getLevelColor(agent.level)}>{agent.level}</Badge>
                <Badge variant="outline">Етап {agent.trainingStage}/5</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="personal" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Лични</TabsTrigger>
            <TabsTrigger value="skills">Умения</TabsTrigger>
            <TabsTrigger value="training">Обучение</TabsTrigger>
            <TabsTrigger value="deals">Сделки</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Дата на назначаване</p>
                    <p className="font-medium">{agent.dateOfHiring}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Имейл</p>
                    <p className="font-medium">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="font-medium">{agent.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Отдел</p>
                    <p className="font-medium">{agent.department}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <Card className="p-4">
              <div className="space-y-4">
                {agent.skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-muted-foreground">{skill.level}%</span>
                    </div>
                    <Progress value={skill.level} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Напредък в обучението</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((stage) => (
                  <div key={stage} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        stage <= agent.trainingStage
                          ? 'bg-success text-success-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {stage}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Етап {stage}</p>
                      <p className="text-sm text-muted-foreground">
                        {stage <= agent.trainingStage ? 'Завършен' : 'Очаква се'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Общо сделки</p>
                <p className="text-2xl font-bold text-foreground">{totalDeals}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Оборот</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(totalTurnover)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Печалба</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(totalProfit)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Среден размер на сделка</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(averageDealSize)}
                </p>
              </Card>
            </div>

            {agent.deals.length > 0 && (
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Представяне във времето
                </h4>
                <DealTrendChart deals={agent.deals} />
              </Card>
            )}

            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Класации</h4>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Експорт в CSV
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Trophy className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Класация по печалба</p>
                    <p className="text-xl font-bold text-foreground">#{profitRank}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Класация по сделки</p>
                    <p className="text-xl font-bold text-foreground">#{dealsRank}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Депозит</TableHead>
                    <TableHead>Стойност</TableHead>
                    <TableHead>Разходи</TableHead>
                    <TableHead>Печалба</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agent.deals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>{deal.date}</TableCell>
                      <TableCell>{deal.client}</TableCell>
                      <TableCell>${deal.deposit.toLocaleString()}</TableCell>
                      <TableCell>${deal.dealValue.toLocaleString()}</TableCell>
                      <TableCell>${(deal.expenses || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-success">
                        ${deal.netProfit.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-4">
              <div className="space-y-6">
                {agent.levelHistory.map((history, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary-foreground" />
                      </div>
                      {index < agent.levelHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getLevelColor(history.level)}>{history.level}</Badge>
                        <span className="text-sm text-muted-foreground">{history.date}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {history.achievements.map((achievement, i) => (
                          <li key={i}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
