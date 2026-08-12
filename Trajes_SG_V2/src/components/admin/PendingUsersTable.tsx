'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { usePendingUsers, useUserAction } from '@/hooks/useAdmin';
import { formatDateTime } from '@/lib/utils/dates';
import type { Profile } from '@/types/models';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserDetailCard } from '@/components/admin/UserDetailCard';

/** Modal para ver el carnet (como en App A) */
function CarnetViewerModal({ user, onClose }: { user: Profile | null; onClose: () => void }) {
  if (!user) return null;

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Verificación de Carnet de Identidad
            <Badge variant="secondary">{user.full_name}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Carnet - Frontal</p>
              <div className="aspect-[1.58] bg-muted rounded-lg border overflow-hidden">
                {user.carnet_frontal_url ? (
                  <img
                    src={user.carnet_frontal_url}
                    alt="Carnet Frontal"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sin foto frontal
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Carnet - Trasera</p>
              <div className="aspect-[1.58] bg-muted rounded-lg border overflow-hidden">
                {user.carnet_trasera_url ? (
                  <img
                    src={user.carnet_trasera_url}
                    alt="Carnet Trasera"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sin foto trasera
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Datos bancarios si existen */}
          {user.bank_details && (
            <div className="p-4 bg-muted/30 rounded-lg border text-sm">
              <p className="font-medium text-brand-red mb-2">Datos para Transferencia Bancaria</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Titular:</span> {(user.bank_details as any).nombre}</div>
                <div><span className="text-muted-foreground">Banco:</span> {(user.bank_details as any).banco}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {(user.bank_details as any).tipoCuenta}</div>
                <div><span className="text-muted-foreground">N° Cuenta:</span> {(user.bank_details as any).numeroCuenta}</div>
                <div><span className="text-muted-foreground">RUT:</span> {(user.bank_details as any).rut}</div>
                <div><span className="text-muted-foreground">Correo:</span> {(user.bank_details as any).correo}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Tabla de usuarios pendientes de aprobación (panel admin) */
export function PendingUsersTable() {
  const { data: users, isLoading } = usePendingUsers();
  const userAction = useUserAction();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [carnetViewUser, setCarnetViewUser] = useState<Profile | null>(null);

  if (isLoading) return <SkeletonTable rows={4} columns={5} />;

  if (!users || users.length === 0) {
    return (
      <EmptyState
        title="Sin solicitudes pendientes"
        description="No hay usuarios esperando aprobación en este momento."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>RUT</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Registrado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.full_name}</TableCell>
              <TableCell>{user.rut}</TableCell>
              <TableCell>{user.city}</TableCell>
              <TableCell>{formatDateTime(user.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* Ver Carnet (App A style) */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCarnetViewUser(user)}
                  >
                    <Eye className="w-3 h-3 mr-1" /> Carnet
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                    Ver detalle
                  </Button>
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={userAction.isPending}
                    onClick={() => userAction.mutate({ userId: user.id, action: { action: 'approve' } })}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={userAction.isPending}
                    onClick={() =>
                      userAction.mutate({ userId: user.id, action: { action: 'reject' } })
                    }
                  >
                    Rechazar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <UserDetailCard user={selectedUser} onClose={() => setSelectedUser(null)} />
      <CarnetViewerModal user={carnetViewUser} onClose={() => setCarnetViewUser(null)} />
    </>
  );
}
