import type { Metadata } from 'next';
import { PendingUsersTable } from '@/components/admin/PendingUsersTable';
import { AllUsersTable } from '@/components/admin/AllUsersTable';

export const metadata: Metadata = { title: 'Gestión de usuarios' };

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Aprueba o rechaza las solicitudes de registro.
          </p>
        </div>
        <PendingUsersTable />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Todos los usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Busca, filtra y administra cualquier cuenta.
          </p>
        </div>
        <AllUsersTable />
      </section>
    </div>
  );
}
