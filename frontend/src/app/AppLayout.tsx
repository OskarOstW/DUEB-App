import { Outlet, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { Topbar } from '@/components/Topbar';
import { BottomNav } from '@/components/BottomNav';
import { useSessionStore } from './sessionStore';
import { ROUTES } from '../config/constants';
import { useUnsavedDataWarning } from '../hooks/useUnsavedDataWarning';

export function AppLayout() {
  useUnsavedDataWarning();
  const navigate = useNavigate();
  const clearSession = useSessionStore((s) => s.clearSession);
  const location = useLocation();
  // Auf Detailseiten mit eigener unterer Aktionsleiste (Formular/Profil) die
  // globale Tab-Leiste ausblenden, damit sich beide Leisten nicht ueberlagern.
  const hideBottomNav = [ROUTES.FORM_FILL, ROUTES.PROFILE].some((p) =>
    matchPath(p, location.pathname),
  );

  const handleLogout = async () => {
    await clearSession();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar onLogout={handleLogout} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onLogout={handleLogout} />
        <main className="flex-1 px-4 pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] pt-5 sm:px-6 md:pb-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
