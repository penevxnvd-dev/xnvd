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
        <CardHeader>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {completedSubsections} от {totalSubsections} подточки завършени
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {Math.round(sectionProgress)}%
                </Badge>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Section Progress Bar */}
            <div className="pb-2 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Прогрес на раздела</span>
                <span className="text-xs font-semibold">{Math.round(sectionProgress)}%</span>
              </div>
              <Progress value={sectionProgress} className="h-2" />
            </div>

            {/* Subsections as Cards */}
            <div className="space-y-4">
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

