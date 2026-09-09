import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { visibleNavItems } from '../app/navigation';
import { useSessionStore } from '../app/sessionStore';

const itemBase =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors min-h-14';

/** Bottom-Tab-Bar (Mobile < md). */
export function BottomNav() {
  const session = useSessionStore((s) => s.session);
  const items = visibleNavItems(session);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(itemBase, isActive ? 'text-accent' : 'text-muted-foreground')
            }
          >
            <Icon className="size-5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
