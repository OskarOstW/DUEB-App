import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from './sessionStore';
import { ROUTES, type Role } from '../config/constants';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Wenn gesetzt, ist die Route auf diese Rolle(n) beschränkt. */
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const session = useSessionStore((s) => s.session);
  const location = useLocation();

  if (!session) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(session.role)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
}
