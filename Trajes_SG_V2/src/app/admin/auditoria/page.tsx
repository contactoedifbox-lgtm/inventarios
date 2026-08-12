import type { Metadata } from 'next';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { CarnetAuditTable } from '@/components/admin/CarnetAuditTable';

export const metadata: Metadata = { title: 'Auditoría' };

export default function AdminAuditoriaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Registro de auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Historial de acciones administrativas sobre la plataforma y accesos a carnets.
        </p>
      </div>

      {/* Auditoría de acciones administrativas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Acciones administrativas</h2>
        <AuditLogTable />
      </section>

      {/* Auditoría de accesos a carnets (App A style) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Accesos a carnets de identidad</h2>
        <p className="text-sm text-muted-foreground">
          Registro de quién y cuándo visualizó fotos de carnet de identidad.
        </p>
        <CarnetAuditTable />
      </section>
    </div>
  );
}
