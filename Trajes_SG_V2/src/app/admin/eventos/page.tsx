import type { Metadata } from 'next';
import { EventsManager } from '@/components/admin/EventsManager';
import { EventForm } from '@/components/admin/EventForm';

export const metadata: Metadata = { title: 'Gestión de eventos' };

export default function AdminEventosPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestión de eventos</h1>
          <p className="text-sm text-muted-foreground">
            Crea eventos y define los límites de arriendos.
          </p>
        </div>
        <EventForm triggerLabel="Crear evento" />
      </div>
      <EventsManager />
    </div>
  );
}
