import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronDown, Circle, GraduationCap, PlayCircle, ShieldCheck, Swords, Video } from 'lucide-react';
import { TrainingSubsection } from '@/data/trainingStructure';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const { lecture, video, practical, handover, exam } = subsection.progress;
  const completed = lecture && video && practical && handover && exam;
  const totalSteps = 5;
  const completedSteps = [lecture, video, practical, handover, exam].filter(Boolean).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  const challengeSteps = [
    {
      id: 'video',
      key: 'video' as const,
      label: 'Видео обучение',
      icon: Video,
      count: subsection.counts?.video,
      checked: video,
      accent: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
    },
    {
      id: 'lecture',
      key: 'lecture' as const,
      label: 'Обучение на живо',
      icon: GraduationCap,
      count: subsection.counts?.lecture,
      checked: lecture,
      accent: 'text-indigo-400',
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-500/10',
    },
    {
      id: 'demo-live',
      key: 'handover' as const,
      label: 'Демонстрация на живо',
      icon: PlayCircle,
      count: subsection.counts?.handover,
      checked: handover,
      accent: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'practical',
      key: 'practical' as const,
      label: subsection.practicalType === 'roleplay' ? 'Ролева игра' : 'Практическа тренировка',
      icon: Swords,
      count: subsection.counts?.practical,
      checked: practical,
      accent: 'text-violet-400',
      border: 'border-violet-500/30',
      bg: 'bg-violet-500/10',
      hasSubmenu: true,
    },
    {
      id: 'video-demo',
      key: 'handover' as const,
      label: 'Видео демонстрация',
      icon: PlayCircle,
      count: subsection.counts?.handover,
      checked: handover,
      accent: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'practical-demo',
      key: 'handover' as const,
      label: 'Практическа тренировка',
      icon: PlayCircle,
      count: subsection.counts?.handover,
      checked: handover,
      accent: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      hasSubmenu: true,
    },
  ];

  const toggleSubmenu = (stepId: string) => {
    setOpenSubmenus((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border transition-all duration-300",
      "bg-gradient-to-br from-white to-slate-50 text-slate-900 border-slate-200",
      "hover:border-cyan-300/60 hover:shadow-[0_10px_24px_rgba(6,182,212,0.12)]",
      completed && "border-emerald-300/80 shadow-[0_10px_24px_rgba(16,185,129,0.14)]"
    )}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <CardHeader className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className={cn(
            "text-sm sm:text-base md:text-lg flex-1 break-words text-slate-900",
            completed && "text-emerald-700 font-semibold"
          )}>
            <span className="mr-2 text-[10px] uppercase tracking-[0.25em] text-cyan-700/70">Challenge</span>
            {subsection.title}
            {completed && (
              <span className="ml-2 text-emerald-600">✓</span>
            )}
          </CardTitle>
          <Badge className={cn(
            "text-xs sm:text-sm flex-shrink-0 border",
            completed
              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
              : "bg-white text-slate-600 border-slate-300"
          )}>
            {completed ? (
              <>
                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                <span>ROOTED</span>
              </>
            ) : (
              <>
                <Circle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                <span>IN PROGRESS</span>
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 items-start">
          {challengeSteps.map((step) => {
            const Icon = step.icon;
            const isSubmenuOpen = openSubmenus.has(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border p-3 transition-all duration-200",
                  "bg-white border-slate-200 hover:border-slate-300",
                  step.checked && `${step.border} ${step.bg}`
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={step.checked}
                    disabled={!editable}
                    onCheckedChange={(checked) =>
                      onProgressUpdate(sectionId, subsection.id, step.key, checked as boolean)
                    }
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-400 border-slate-400"
                  />
                  <div className={cn(
                    "rounded-lg p-2 border border-slate-200 bg-slate-50",
                    step.checked && step.border
                  )}>
                    <Icon className={cn("h-4 w-4", step.checked ? step.accent : "text-slate-500")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-xs sm:text-sm font-medium truncate",
                      step.checked ? "text-slate-900" : "text-slate-700"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {typeof step.count === 'number' ? `${step.count} задачи` : 'Критична стъпка'}
                    </p>
                  </div>
                  {step.hasSubmenu && (
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(step.id)}
                      className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"
                      aria-label="Отвори подменю"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isSubmenuOpen && "rotate-180")} />
                    </button>
                  )}
                  {step.checked && !step.hasSubmenu && (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                {step.hasSubmenu && isSubmenuOpen && (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">Подменю 1</div>
                    <div className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">Подменю 2</div>
                    <div className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">Подменю 3</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
};

