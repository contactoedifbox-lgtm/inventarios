'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/constants';
import { UserRole } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Vigila el rol del usuario mientras está en 'pending':
 * - useAuth hace polling cada 15s (refetchInterval condicional)
 * - Al detectar aprobación/rechazo redirige automáticamente
 * - Botón manual "Ya fui aprobado" que fuerza refreshSession + re-lectura
 */
export function PendingStatusWatcher() {
  const router = useRouter();
  const { profile, refreshProfile, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!profile) return;

    if (profile.role === UserRole.Approved) {
      toast.success('¡Tu cuenta fue aprobada! Bienvenido.');
      router.push(ROUTES.dashboard.arriendo);
      router.refresh();
    } else if (profile.role === UserRole.SuperAdmin) {
      router.push(ROUTES.admin.home);
      router.refresh();
    }
    // rejected/suspended: la página ya muestra el estado correspondiente
  }, [profile, router]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
    if (profile?.role === UserRole.Pending) {
      toast.info('Tu cuenta sigue en revisión. Te avisaremos por correo.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        variant="outline"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        aria-live="polite"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {isRefreshing ? 'Verificando...' : 'Ya fui aprobado, verificar estado'}
      </Button>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Cerrar sesión
      </button>
      <p className="text-xs text-muted-foreground" role="status">
        Esta página se actualiza automáticamente cada 15 segundos.
      </p>
    </div>
  );
}