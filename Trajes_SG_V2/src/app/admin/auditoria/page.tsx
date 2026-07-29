import type { Metadata } from 'next';
import { AuditLogTable } from '@/components/admin/AuditLogTable';

export const metadata: Metadata = { title: 'Auditoría' };

export default function AdminAuditoriaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Registro de auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Historial de acciones administrativas sobre la plataforma.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}
