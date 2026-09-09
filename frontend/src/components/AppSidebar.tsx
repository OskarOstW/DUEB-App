import { NavLink } from 'react-router-dom';
import { LogOut, ShieldCheck, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { visibleNavItems } from '../app/navigation';
import { useSessionStore } from '../app/sessionStore';
import { ROLES } from '../config/constants';

interface AppSidebarProps {
  onLogout: () => void;
}

const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';

/** Dunkle, persistente Seitenleiste (Desktop/Tablet ≥ md). */
export function AppSidebar({ onLogout }: AppSidebarProps) {
  const session = useSessionStore((s) => s.session);
  const isAdmin = session?.role === ROLES.ADMIN;

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      {/* Marke */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 items-center justify-center rounded-lg bg-sidebar-primary px-2.5 text-sm font-extrabold tracking-tight text-sidebar-primary-foreground">
          DUEB App
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">Digitale</div>
          <div className="text-sm font-semibold text-sidebar-foreground/80">Übungsbeobachtung</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleNavItems(session).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  itemBase,
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Konto */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 px-2 py-2 text-sm">
          {isAdmin ? (
            <ShieldCheck className="size-4 text-sidebar-primary" />
          ) : (
            <Eye className="size-4 text-sidebar-foreground/70" />
          )}
          <span className="truncate text-white">
            {session?.firstName || session?.username}
          </span>
          <span className="ml-auto text-xs text-sidebar-foreground/60">
            {isAdmin ? 'Admin' : 'Beobachter'}
          </span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            itemBase,
            'mt-1 w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <LogOut className="size-5 shrink-0" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
