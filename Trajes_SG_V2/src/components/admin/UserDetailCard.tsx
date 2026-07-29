'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUserAction } from '@/hooks/useAdmin';
import { formatDateTime } from '@/lib/utils/dates';
import { STORAGE_BUCKETS } from '@/config/constants';
import { UserRole } from '@/types/enums';
import type { Profile } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface UserDetailCardProps {
  user: Profile | null;
  onClose: () => void;
}

const roleLabels: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Administrador',
  [UserRole.Pending]: 'Pendiente',
  [UserRole.Approved]: 'Aprobado',
  [UserRole.Rejected]: 'Rechazado',
  [UserRole.Suspended]: 'Suspendido',
};

/** Detalle completo de un usuario, incluida la foto del carnet (URL firmada) */
export function UserDetailCard({ user, onClose }: UserDetailCardProps) {
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const userAction = useUserAction();

  useEffect(() => {
    if (!user?.id_card_path) {
      setIdCardUrl(null);
      return;
    }

    const loadSignedUrl = async () => {
      setIsLoadingImage(true);
      const supabase = createClient();
      // El super admin puede leer 'id-cards' por política RLS de storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.idCards)
        .createSignedUrl(user.id_card_path as string, 60 * 10);

      if (error) {
        toast.error('No se pudo cargar la foto del carnet.');
        setIdCardUrl(null);
      } else {
        setIdCardUrl(data.signedUrl);
      }
      setIsLoadingImage(false);
    };

    void loadSignedUrl();
  }, [user]);

  if (!user) return null;

  const runAction = (action: 'approve' | 'reject' | 'suspend' | 'reactivate') => {
    const reason =
      action === 'reject' || action === 'suspend'
        ? window.prompt('Motivo (opcional, mín. 5 caracteres):') || undefined
        : undefined;

    const payload =
      action === 'reject'
        ? { action: 'reject' as const, reason }
        : action === 'suspend'
          ? { action: 'suspend' as const, reason }
          : action === 'approve'
            ? { action: 'approve' as const }
            : { action: 'reactivate' as const };

    userAction.mutate({ userId: user.id, action: payload }, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user.full_name}
            <Badge variant="secondary">{roleLabels[user.role] ?? user.role}</Badge>
          </DialogTitle>
          <DialogDescription>Registrado el {formatDateTime(user.created_at)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-medium text-muted-foreground">RUT</p>
              <p>{user.rut}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Teléfono</p>
              <p>{user.phone}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Dirección</p>
              <p>{user.address}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Ciudad</p>
              <p>{user.city}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium text-muted-foreground">Carnet de identidad</p>
            {isLoadingImage ? (
              <div className="flex h-40 items-center justify-center rounded-md border">
                <LoadingSpinner />
              </div>
            ) : idCardUrl ? (
              <Image
                src={idCardUrl}
                alt={`Carnet de ${user.full_name}`}
                width={640}
                height={400}
                className="w-full rounded-md border object-contain"
                unoptimized
              />
            ) : (
              <p className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                Sin foto de carnet
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {user.role === UserRole.Pending && (
            <>
              <Button
                variant="brand"
                disabled={userAction.isPending}
                onClick={() => runAction('approve')}
              >
                Aprobar
              </Button>
              <Button
                variant="destructive"
                disabled={userAction.isPending}
                onClick={() => runAction('reject')}
              >
                Rechazar
              </Button>
            </>
          )}
          {user.role === UserRole.Approved && (
            <Button
              variant="destructive"
              disabled={userAction.isPending}
              onClick={() => runAction('suspend')}
            >
              Suspender
            </Button>
          )}
          {(user.role === UserRole.Suspended || user.role === UserRole.Rejected) && (
            <Button
              variant="brand"
              disabled={userAction.isPending}
              onClick={() => runAction('reactivate')}
            >
              Reactivar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
