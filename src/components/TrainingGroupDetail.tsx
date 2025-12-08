import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrainingGroup } from '@/types';
// Avatar removed - using modern design with initials badges instead
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Calendar, Users, BookOpen, CheckCircle2 } from 'lucide-react';
import { Progress } from './ui/progress';

interface TrainingGroupDetailProps {
  group: TrainingGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTrainingContent = (day: number) => {
  switch (day) {
    case 1:
      return {
        title: 'Ден 1: Встъпително обучение',
        duration: '2 часа',
        topics: [
          'Запознаване с компанията',
          'Основи на недвижимите имоти',
          'Етика и правила',
          'Инструменти и системи',
        ],
      };
    case 2:
      return {
        title: 'Ден 2: Разговор с купувач',
        duration: '4 часа',
        topics: [
          'Идентифициране на нуждите',
          'Представяне на имоти',
          'Техники на убеждаване',
          'Работа с възражения',
        ],
      };
    case 3:
      return {
        title: 'Ден 3: Разговор с продавач и изпит',
        duration: '6 часа',
        topics: [
          'Оценка на имоти',
          'Преговори с продавачи',
          'Сключване на договори',
          'Финален изпит',
        ],
      };
    default:
      return null;
  }
};

export const TrainingGroupDetail = ({ group, open, onOpenChange }: TrainingGroupDetailProps) => {
  if (!group) return null;

  const trainingContent = getTrainingContent(group.currentDay);
  const progress = (group.currentDay / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Детайли за група</DialogTitle>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Badge variant={group.status === 'активна' ? 'default' : 'secondary'}>
                {group.status === 'активна' ? 'Активна група' : 'Завършена група'}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Прогрес: Ден {group.currentDay} от 3
              </div>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/30 flex-shrink-0">
                {group.leader.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{group.leader}</h3>
                <p className="text-muted-foreground">Инструктор по обучение</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Информация за групата</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>📅 Дата на започване: <strong>{group.startDate}</strong></p>
                  <p>👥 Брой курсисти: <strong>{group.trainees.length}</strong></p>
                  <p>📊 Текущ етап: <strong>Ден {group.currentDay}</strong></p>
                </div>
              </div>
            </div>
          </Card>

          {trainingContent && (
            <Card className="p-4 bg-accent/5">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-accent mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">{trainingContent.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    ⏱️ Продължителност: {trainingContent.duration}
                  </p>
                  <div className="space-y-2">
                    {trainingContent.topics.map((topic, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Курсисти в групата</h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {group.trainees.map((trainee) => (
                <div
                  key={trainee.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/30 flex-shrink-0">
                    {trainee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{trainee.name}</p>
                    <p className="text-sm text-muted-foreground">{trainee.email}</p>
                  </div>
                  <Badge variant="outline">Стаж {trainee.trainingStage}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {group.status === 'завършена' && (
            <Card className="p-4 bg-success/10 border-success">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <h4 className="font-semibold text-success">Групата завърши успешно</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Всички курсисти преминаха изпита и стават реализатори
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
