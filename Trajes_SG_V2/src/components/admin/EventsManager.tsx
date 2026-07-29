'use client';

import { useEvents, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents';
import { formatDateLong, isEventPast } from '@/lib/utils/dates';
import type { Event } from '@/types/models';
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
import { EventForm } from '@/components/admin/EventForm';

/** Tabla de eventos con acciones de editar, archivar y eliminar */
export function EventsManager() {
  const { data: events, isLoading } = useEvents(true);
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  if (isLoading) return <SkeletonTable rows={4} columns={5} />;

  if (!events || events.length === 0) {
    return (
      <EmptyState
        title="Sin eventos"
        description="Crea el primer evento para habilitar los arriendos."
      />
    );
  }

  const toggleArchive = (event: Event) => {
    updateEvent.mutate({
      eventId: event.id,
      input: {
        name: event.name,
        event_date: event.event_date,
        max_global_rentals: event.max_global_rentals,
        max_user_rentals: event.max_user_rentals,
        is_archived: !event.is_archived,
      },
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Límites</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">{event.name}</TableCell>
            <TableCell>{formatDateLong(event.event_date)}</TableCell>
            <TableCell className="text-sm">
              Global: {event.max_global_rentals} · Por usuario: {event.max_user_rentals}
            </TableCell>
            <TableCell>
              {event.is_archived ? (
                <Badge variant="secondary">Archivado</Badge>
              ) : isEventPast(event.event_date) ? (
                <Badge variant="danger">Finalizado</Badge>
              ) : (
                <Badge variant="success">Vigente</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <EventForm event={event} triggerLabel="Editar" />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateEvent.isPending}
                  onClick={() => toggleArchive(event)}
                >
                  {event.is_archived ? 'Desarchivar' : 'Archivar'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteEvent.isPending}
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el evento "${event.name}"?`)) {
                      deleteEvent.mutate(event.id);
                    }
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
