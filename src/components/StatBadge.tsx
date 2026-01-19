import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatBadgeProps {
  icon: LucideIcon;
  value: string | number;
  title: string;
  colorScheme: 'pink' | 'amber' | 'green' | 'blue' | 'purple' | 'orange' | 'emerald';
  className?: string;
}

const colorSchemes = {
  pink: {
    bg: 'bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-red-500/5 hover:from-pink-500/25 hover:via-rose-500/15 hover:to-red-500/10',
    border: 'border-pink-500/30 hover:border-pink-500/50 dark:border-pink-400/20 dark:hover:border-pink-400/40',
    icon: 'text-pink-600 dark:text-pink-400',
    text: 'text-pink-700 dark:text-pink-300',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/5 hover:from-amber-500/25 hover:via-orange-500/15 hover:to-yellow-500/10',
    border: 'border-amber-500/30 hover:border-amber-500/50 dark:border-amber-400/20 dark:hover:border-amber-400/40',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-teal-500/5 hover:from-green-500/25 hover:via-emerald-500/15 hover:to-teal-500/10',
    border: 'border-green-500/30 hover:border-green-500/50 dark:border-green-400/20 dark:hover:border-green-400/40',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-700 dark:text-green-300',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-500/5 hover:from-blue-500/25 hover:via-indigo-500/15 hover:to-blue-500/10',
    border: 'border-blue-500/30 hover:border-blue-500/50 dark:border-blue-400/20 dark:hover:border-blue-400/40',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-purple-500/5 hover:from-purple-500/25 hover:via-purple-500/15 hover:to-purple-500/10',
    border: 'border-purple-500/30 hover:border-purple-500/50 dark:border-purple-400/20 dark:hover:border-purple-400/40',
    icon: 'text-purple-600 dark:text-purple-400',
    text: 'text-purple-700 dark:text-purple-300',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500/15 via-orange-500/10 to-orange-500/5 hover:from-orange-500/25 hover:via-orange-500/15 hover:to-orange-500/10',
    border: 'border-orange-500/30 hover:border-orange-500/50 dark:border-orange-400/20 dark:hover:border-orange-400/40',
    icon: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-700 dark:text-orange-300',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/25 hover:via-emerald-500/15 hover:to-emerald-500/10',
    border: 'border-emerald-500/30 hover:border-emerald-500/50 dark:border-emerald-400/20 dark:hover:border-emerald-400/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
};

export const StatBadge = ({ icon: Icon, value, title, colorScheme, className }: StatBadgeProps) => {
  const colors = colorSchemes[colorScheme];

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2',
        colors.bg,
        colors.border,
        'border transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md',
        className
      )}
      title={title}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', colors.icon, 'group-hover:scale-110 transition-transform')} />
        <span className={cn('text-xs sm:text-sm font-bold', colors.text)}>{value}</span>
      </div>
    </div>
  );
};
