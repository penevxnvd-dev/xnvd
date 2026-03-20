import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { TrainingSection } from '@/data/trainingStructure';
import { TrainingSubsectionCard } from './TrainingSubsectionCard';
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

const SECTION_STYLE_CONFIG: Record<string, { accent: string; border: string }> = {
  'work-with-buyer': {
    accent: 'text-cyan-700/70',
    border: 'hover:border-cyan-300/60',
  },
  'view-organization': {
    accent: 'text-blue-700/70',
    border: 'hover:border-blue-300/60',
  },
  'seller-conversation': {
    accent: 'text-violet-700/70',
    border: 'hover:border-violet-300/60',
  },
  'conducting-views': {
    accent: 'text-amber-700/70',
    border: 'hover:border-amber-300/60',
  },
  'sales-principles': {
    accent: 'text-emerald-700/70',
    border: 'hover:border-emerald-300/60',
  },
};

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
  const sectionStyles = SECTION_STYLE_CONFIG[section.id] ?? {
    accent: 'text-cyan-700/70',
    border: 'hover:border-cyan-300/60',
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border",
      "bg-gradient-to-br from-white to-slate-50 text-slate-900",
      `${sectionStyles.border} hover:shadow-[0_10px_30px_rgba(6,182,212,0.12)]`,
      isSectionCompleted 
        ? "border-emerald-300/80 shadow-[0_10px_30px_rgba(16,185,129,0.14)]" 
        : "border-slate-200"
    )} data-section-id={section.id}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CardHeader className="p-4 sm:p-6 border-b border-slate-200" data-section-header={section.id}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                <div className="text-left flex-1">
                  <CardTitle className={cn(
                    "text-sm sm:text-base md:text-lg break-words text-slate-900",
                    isSectionCompleted && "text-emerald-700 font-bold"
                  )}>
                    {section.title}
                    {isSectionCompleted && (
                      <span className="ml-2 text-emerald-600">✓</span>
                    )}
                  </CardTitle>
                  <div className="mt-1.5 sm:mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] sm:text-xs font-medium tracking-wide",
                        isSectionCompleted
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      )}
                    >
                      {completedSubsections}/{totalSubsections} завършени подточки
                    </span>
                  </div>
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

