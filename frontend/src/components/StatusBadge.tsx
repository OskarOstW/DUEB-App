import { Wifi, WifiOff, CloudUpload, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'online' | 'offline' | 'pending' | 'ok';

const TONE: Record<Tone, string> = {
  online: 'bg-status-online/10 text-status-online ring-status-online/25',
  offline: 'bg-status-offline/10 text-status-offline ring-status-offline/25',
  pending: 'bg-status-pending/10 text-status-pending ring-status-pending/25',
  ok: 'bg-status-online/10 text-status-online ring-status-online/25',
};

interface StatusBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}

const DEFAULT_ICON: Record<Tone, React.ReactNode> = {
  online: <Wifi className="size-3.5" />,
  offline: <WifiOff className="size-3.5" />,
  pending: <CloudUpload className="size-3.5" />,
  ok: <CheckCircle2 className="size-3.5" />,
};

/** Kompakter Status-Chip (online/offline/ungesendet/ok). */
export function StatusBadge({ tone, children, icon = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONE[tone],
        className,
      )}
    >
      {icon && DEFAULT_ICON[tone]}
      {children}
    </span>
  );
}
