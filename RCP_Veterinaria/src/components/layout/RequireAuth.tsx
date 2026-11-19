import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type Rol } from '@/features/auth/AuthProvider';

interface RequireAuthProps {
  children: ReactNode;
  roles?: Rol[];
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <div className="p-8 text-center text-slate-500">Cargando sesion...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && perfil && !roles.includes(perfil.rol)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
