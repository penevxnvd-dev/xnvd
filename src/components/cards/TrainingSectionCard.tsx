import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, Lock, Target } from 'lucide-react';
import { TrainingSection } from '@/data/trainingStructure';
import { TrainingSubsectionCard } from './TrainingSubsectionCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TrainingSectionCardProps {
  section: TrainingSection;
  onProgressUpdate: (
    sectionId: string,
    subsectionId: string,
    field: 'lecture' | 'video' | 'practical' | 'handover' | 'exam',
    checked: boolean
  ) => void;
  editable?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: (sectionId: string) => void;
}

export const TrainingSectionCard = ({
  section,
  onProgressUpdate,
  editable = true,
  isExpanded: controlledIsOpen,
  onToggleExpanded
}: TrainingSectionCardProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const handleToggle = (open: boolean) => {
    if (onToggleExpanded) {
      onToggleExpanded(section.id);
    } else {
      setInternalIsOpen(open);
    }
  };

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
  const isSectionCompleted = completedSubsections === totalSubsections && totalSubsections > 0;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border",
      "bg-gradient-to-br from-white to-slate-50 text-slate-900",
      "hover:border-cyan-300/60 hover:shadow-[0_10px_30px_rgba(6,182,212,0.12)]",
      isSectionCompleted 
        ? "border-emerald-300/80 shadow-[0_10px_30px_rgba(16,185,129,0.14)]" 
        : "border-slate-200"
    )}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CardHeader className="p-4 sm:p-6 border-b border-slate-200">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                <div className={cn(
                  "p-1.5 sm:p-2 rounded-lg flex-shrink-0 border",
                  isSectionCompleted
                    ? "bg-emerald-100 border-emerald-300"
                    : "bg-cyan-50 border-cyan-200"
                )}>
                  {isSectionCompleted ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  ) : (
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <CardTitle className={cn(
                    "text-sm sm:text-base md:text-lg break-words text-slate-900",
                    isSectionCompleted && "text-emerald-700 font-bold"
                  )}>
                    <span className="mr-2 text-[10px] uppercase tracking-[0.25em] text-cyan-700/70">Mission</span>
                    {section.title}
                    {isSectionCompleted && (
                      <span className="ml-2 text-emerald-600">✓</span>
                    )}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1 break-words">
                    {completedSubsections}/{totalSubsections} challenges rooted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                {isSectionCompleted ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs sm:text-sm">
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    CLEARED
                  </Badge>
                ) : null}
                <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3 sm:space-y-4 p-4 sm:p-6">
            {/* Section Progress Bar */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-xs sm:text-sm text-slate-500 break-words uppercase tracking-[0.2em]">Section Intel</span>
                <span className="text-xs sm:text-sm font-semibold flex-shrink-0 ml-2 text-emerald-700">{Math.round(sectionProgress)}%</span>
              </div>
              <Progress value={sectionProgress} className="h-2 bg-slate-100" />
              {!isSectionCompleted && (
                <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Complete all challenge steps to clear this mission.
                </p>
              )}
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

