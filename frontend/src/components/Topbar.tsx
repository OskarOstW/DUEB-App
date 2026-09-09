import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useServerReachability } from '../lib/serverStatus';

interface TopbarProps {
  onLogout: () => void;
}

/**
 * Schlanke Kopfleiste: Marke (mobil), Online-Status, Abmelden (mobil).
 * pt-[safe-area-inset-top] haelt den Inhalt als installierte PWA unter
 * der Dynamic Island / dem Notch (iOS standalone).
 */
export function Topbar({ onLogout }: TopbarProps) {
  const online = useOnlineStatus();
  const reachable = useServerReachability();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <div className="flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-2 text-xs font-extrabold tracking-tight text-primary-foreground">
            DUEB App
          </div>
          <span className="truncate text-sm font-semibold text-muted-foreground">
            Digitale Übungsbeobachtung
          </span>
        </div>
        <div className="hidden md:block" />
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge tone={online && reachable !== false ? 'online' : 'offline'}>
            {!online ? 'Offline' : reachable === false ? 'Server nicht erreichbar' : 'Online'}
          </StatusBadge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Abmelden"
            className="size-11 md:hidden"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
