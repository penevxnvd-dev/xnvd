import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, BookOpen } from 'lucide-react';
import { TrainingSection } from '@/data/trainingStructure';
import { TrainingSubsectionCard } from './TrainingSubsectionCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface TrainingSectionCardProps {
  section: TrainingSection;
  onProgressUpdate: (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => void;
  editable?: boolean;
}

export const TrainingSectionCard = ({
  section,
  onProgressUpdate,
  editable = true
}: TrainingSectionCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate section progress
  const totalSubsections = section.subsections.length;
  const completedSubsections = section.subsections.filter(sub => 
    sub.progress.lecture && 
    sub.progress.video && 
    sub.progress.practical && 
    sub.progress.handover && 
    sub.progress.exam
  ).length;
  const sectionProgress = totalSubsections > 0 ? (completedSubsections / totalSubsections) * 100 : 0;

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-3 sm:p-6">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <CardTitle className="text-[10px] sm:text-xs md:text-sm lg:text-base break-words">{section.title}</CardTitle>
                  <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1 break-words">
                    {completedSubsections} от {totalSubsections} подточки завършени
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                  {Math.round(sectionProgress)}%
                </Badge>
                <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3 sm:space-y-4 p-3 sm:p-6">
            {/* Section Progress Bar */}
            <div className="pb-2 border-b border-border">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground break-words">Прогрес на раздела</span>
                <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold flex-shrink-0 ml-2">{Math.round(sectionProgress)}%</span>
              </div>
              <Progress value={sectionProgress} className="h-1.5 sm:h-2" />
            </div>

            {/* Subsections as Cards */}
            <div className="space-y-3 sm:space-y-4">
              {section.subsections.map((subsection) => (
                <TrainingSubsectionCard
                  key={subsection.id}
                  subsection={subsection}
                  sectionId={section.id}
                  onProgressUpdate={onProgressUpdate}
                  editable={editable}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

