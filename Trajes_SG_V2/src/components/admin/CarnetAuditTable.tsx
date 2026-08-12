'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/dates';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';

interface CarnetAccessLog {
  id: string;
  viewer_id: string;
  viewer_name: string;
  viewer_role: string;
  target_user_id: string;
  target_user_name: string;
  photo_type: 'frente' | 'trasera' | 'ambas';
  timestamp: string;
}

/** Tabla de auditoría de accesos a carnets (como en App A) */
export function CarnetAuditTable() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['carnet-audit', page],
    queryFn: async () => {
      const supabase = createClient();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('carnet_access_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      return {
        data: (data ?? []) as CarnetAccessLog[],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });

  if (isLoading) return <SkeletonTable rows={5} columns={5} />;

  const logs = data?.data ?? [];

  if (logs.length === 0) {
    return (
      <EmptyState
        title="Sin registros de auditoría"
        description="Los accesos a carnets de identidad aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Actualizar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y Hora</TableHead>
            <TableHead>Inspector (Quien Vió)</TableHead>
            <TableHead>Rol del Inspector</TableHead>
            <TableHead>Titular (Carnet Visto)</TableHead>
            <TableHead>Tipo Foto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap font-mono text-sm">
                {formatDateTime(log.timestamp)}
              </TableCell>
              <TableCell className="font-medium">{log.viewer_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{log.viewer_role}</Badge>
              </TableCell>
              <TableCell>{log.target_user_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase">
                  {log.photo_type}
                </Badge>
              </TableCell>
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
    </div>
  );
}
