import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { TrainingSubsection } from '@/data/trainingStructure';

interface TrainingSubsectionCardProps {
  subsection: TrainingSubsection;
  sectionId: string;
  onProgressUpdate: (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => void;
  editable?: boolean;
}

export const TrainingSubsectionCard = ({
  subsection,
  sectionId,
  onProgressUpdate,
  editable = true
}: TrainingSubsectionCardProps) => {
  const { lecture, video, practical, handover, exam } = subsection.progress;
  const completed = lecture && video && practical && handover && exam;
  const totalSteps = 5;
  const completedSteps = [lecture, video, practical, handover, exam].filter(Boolean).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{subsection.title}</CardTitle>
          <Badge variant={completed ? "default" : "outline"} className={completed ? "bg-success" : ""}>
            {completed ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Завършено
              </>
            ) : (
              <Circle className="h-3 w-3" />
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Table - Horizontal with Progress Bar */}
        <div className="w-full space-y-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Лекция</TableHead>
                  <TableHead className="text-center">Видео</TableHead>
                  <TableHead className="text-center">Практическо</TableHead>
                  <TableHead className="text-center">Предаване</TableHead>
                  <TableHead className="text-center">Изпит</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={lecture}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'lecture', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={video}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'video', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={practical}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'practical', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={handover}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'handover', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={exam}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'exam', checked as boolean)
                      }
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Horizontal Progress Bar */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Прогрес
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

