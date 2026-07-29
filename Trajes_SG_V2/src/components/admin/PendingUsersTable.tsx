'use client';

import { useState } from 'react';
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
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserDetailCard } from '@/components/admin/UserDetailCard';

/** Tabla de usuarios pendientes de aprobación (panel admin) */
export function PendingUsersTable() {
  const { data: users, isLoading } = usePendingUsers();
  const userAction = useUserAction();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

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
    </>
  );
}
