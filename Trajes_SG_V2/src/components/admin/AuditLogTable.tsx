'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAdmin';
import { formatDateTime } from '@/lib/utils/dates';
import { AuditAction } from '@/types/enums';
import { Badge } from '@/components/ui/badge';
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

const actionLabels: Record<AuditAction, string> = {
  [AuditAction.UserApproved]: 'Usuario aprobado',
  [AuditAction.UserRejected]: 'Usuario rechazado',
  [AuditAction.UserSuspended]: 'Usuario suspendido',
  [AuditAction.UserReactivated]: 'Usuario reactivado',
  [AuditAction.UserDeleted]: 'Usuario eliminado',
  [AuditAction.EventCreated]: 'Evento creado',
  [AuditAction.EventUpdated]: 'Evento actualizado',
  [AuditAction.EventDeleted]: 'Evento eliminado',
  [AuditAction.RentalConfirmed]: 'Arriendo confirmado',
  [AuditAction.SaleConfirmed]: 'Venta confirmada',
};

/** Tabla paginada del registro de auditoría (solo super admin) */
export function AuditLogTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);

  if (isLoading) return <SkeletonTable rows={6} columns={5} />;

  const logs = data?.data ?? [];

  if (logs.length === 0) {
    return (
      <EmptyState
        title="Sin registros de auditoría"
        description="Las acciones administrativas aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Administrador</TableHead>
            <TableHead>Usuario objetivo</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
              <TableCell>
                <Badge variant="outline">{actionLabels[log.action] ?? log.action}</Badge>
              </TableCell>
              <TableCell>{log.admin.full_name}</TableCell>
              <TableCell>{log.target_user?.full_name ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{log.ip_address ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages} ({data.count} registros)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
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
    </div>
  );
}
