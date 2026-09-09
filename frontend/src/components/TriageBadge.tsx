import { cn } from '@/lib/utils';
import { triageKey, TRIAGE_SURFACE } from '@/lib/triage';

interface TriageBadgeProps {
  /** Roh-Kategorie (z. B. "SK II", "sk1", "verstorben"). */
  category?: string | null;
  /** Anzuzeigender Text (Default: die Kategorie selbst). */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
} as const;

/** Prominentes Triage-Label in der medizinischen Standardfarbe. */
export function TriageBadge({ category, label, size = 'md', className }: TriageBadgeProps) {
  const key = triageKey(category);
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-bold tracking-tight',
        TRIAGE_SURFACE[key],
        SIZES[size],
        className,
      )}
    >
      {label ?? category ?? 'Unbekannt'}
    </span>
  );
}
