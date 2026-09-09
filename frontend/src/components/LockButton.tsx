import { Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockButtonProps {
  locked: boolean;
  onClick: () => void;
  /** Größe des runden Buttons. */
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

/**
 * Runder Bestätigen-/Freigeben-Schalter (Lock-Toggle).
 * Gesperrt = grün gefüllt mit Haken, offen = Stift-Umriss.
 */
export function LockButton({ locked, onClick, size = 'md', ...rest }: LockButtonProps) {
  const dim = size === 'sm' ? 'size-8' : 'size-10';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rest['aria-label'] ?? (locked ? 'Bearbeitung freigeben' : 'Bestätigen')}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border transition-colors',
        dim,
        locked
          ? 'border-status-online bg-status-online text-white hover:bg-status-online/90'
          : 'border-input bg-card text-muted-foreground hover:bg-secondary',
      )}
    >
      {locked ? <Check className="size-4" /> : <Pencil className="size-4" />}
    </button>
  );
}
