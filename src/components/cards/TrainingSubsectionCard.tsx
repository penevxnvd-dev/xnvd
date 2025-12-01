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
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm sm:text-base md:text-lg flex-1 break-words">{subsection.title}</CardTitle>
          <Badge variant={completed ? "default" : "outline"} className={`${completed ? "bg-success" : ""} text-xs sm:text-sm flex-shrink-0`}>
            {completed ? (
              <>
                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                <span>Завършено</span>
              </>
            ) : (
              <Circle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        {/* Progress Table - Horizontal with Progress Bar */}
        <div className="w-full space-y-2 sm:space-y-3">
          <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center text-xs sm:text-sm">Лекция</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Видео</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Практическо</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Предаване</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Изпит</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-center p-2 sm:p-4">
                    <Checkbox
                      checked={lecture}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'lecture', checked as boolean)
                      }
                      className="scale-90 sm:scale-100"
                    />
                  </TableCell>
                  <TableCell className="text-center p-2 sm:p-4">
                    <Checkbox
                      checked={video}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'video', checked as boolean)
                      }
                      className="scale-90 sm:scale-100"
                    />
                  </TableCell>
                  <TableCell className="text-center p-2 sm:p-4">
                    <Checkbox
                      checked={practical}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'practical', checked as boolean)
                      }
                      className="scale-90 sm:scale-100"
                    />
                  </TableCell>
                  <TableCell className="text-center p-2 sm:p-4">
                    <Checkbox
                      checked={handover}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'handover', checked as boolean)
                      }
                      className="scale-90 sm:scale-100"
                    />
                  </TableCell>
                  <TableCell className="text-center p-2 sm:p-4">
                    <Checkbox
                      checked={exam}
                      disabled={!editable}
                      onCheckedChange={(checked) =>
                        onProgressUpdate(sectionId, subsection.id, 'exam', checked as boolean)
                      }
                      className="scale-90 sm:scale-100"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Horizontal Progress Bar */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide break-words">
                Прогрес
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5 sm:h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

