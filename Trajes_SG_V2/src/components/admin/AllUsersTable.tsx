'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { useUsers, useUserAction } from '@/hooks/useAdmin';
import { formatDateShort } from '@/lib/utils/dates';
import { UserRole } from '@/types/enums';
import type { Profile } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserDetailCard } from '@/components/admin/UserDetailCard';

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  [UserRole.SuperAdmin]: 'default',
  [UserRole.Maestro]: 'default',
  [UserRole.Propietario]: 'success',
  [UserRole.Arrendatario]: 'secondary',
  [UserRole.Pending]: 'warning',
  [UserRole.Approved]: 'success',
  [UserRole.Rejected]: 'danger',
  [UserRole.Suspended]: 'secondary',
};

const roleLabels: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Admin',
  [UserRole.Maestro]: 'Maestro',
  [UserRole.Propietario]: 'Propietario',
  [UserRole.Arrendatario]: 'Arrendatario',
  [UserRole.Pending]: 'Pendiente',
  [UserRole.Approved]: 'Aprobado',
  [UserRole.Rejected]: 'Rechazado',
  [UserRole.Suspended]: 'Suspendido',
};

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

/** Tabla paginada de todos los usuarios con filtro por rol */
export function AllUsersTable() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [carnetViewUser, setCarnetViewUser] = useState<Profile | null>(null);

  const { data, isLoading } = useUsers(page, roleFilter);
  const userAction = useUserAction();

  if (isLoading) return <SkeletonTable rows={6} columns={6} />;

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          value={roleFilter ?? 'all'}
          onValueChange={(value) => {
            setRoleFilter(value === 'all' ? undefined : (value as UserRole));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value={UserRole.Pending}>Pendientes</SelectItem>
            <SelectItem value={UserRole.Approved}>Aprobados</SelectItem>
            <SelectItem value={UserRole.Propietario}>Propietarios</SelectItem>
            <SelectItem value={UserRole.Arrendatario}>Arrendatarios</SelectItem>
            <SelectItem value={UserRole.Rejected}>Rechazados</SelectItem>
            <SelectItem value={UserRole.Suspended}>Suspendidos</SelectItem>
            <SelectItem value={UserRole.Maestro}>Maestros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.length === 0 ? (
        <EmptyState title="Sin usuarios" description="No hay usuarios con este filtro." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.rut}</TableCell>
                  <TableCell>{user.city}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[user.role] ?? 'secondary'}>
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateShort(user.created_at)}</TableCell>
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
                        Detalle
                      </Button>
                      {user.role === UserRole.Approved && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={userAction.isPending}
                          onClick={() =>
                            userAction.mutate({ userId: user.id, action: { action: 'suspend' } })
                          }
                        >
                          Suspender
                        </Button>
                      )}
                      {user.role === UserRole.Suspended && (
                        <Button
                          size="sm"
                          variant="brand"
                          disabled={userAction.isPending}
                          onClick={() =>
                            userAction.mutate({ userId: user.id, action: { action: 'reactivate' } })
                          }
                        >
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages} ({data.count} usuarios)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <UserDetailCard user={selectedUser} onClose={() => setSelectedUser(null)} />
      <CarnetViewerModal user={carnetViewUser} onClose={() => setCarnetViewUser(null)} />
    </div>
  );
}
