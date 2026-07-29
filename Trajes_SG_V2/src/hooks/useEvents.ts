'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { AuditAction } from '@/types/enums';
import type { Event } from '@/types/models';
import type { Json } from '@/types/database.types';
import type { EventInput } from '@/lib/validations/user.schema';

/**
 * Hooks de eventos: listado público y CRUD de administrador.
 * Las mutaciones de admin insertan su registro de auditoría
 * (la política audit_insert_admin lo permite para super_admin).
 */

// ============================================================
// Listado de eventos (todos: la política events_select_all es pública)
// ============================================================

export function useEvents(includeArchived = false) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['events', { includeArchived }],
    queryFn: async (): Promise<Event[]> => {
      let query = supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (!includeArchived) query = query.eq('is_archived', false);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as Event[];
    },
  });
}

/** Eventos vigentes (fecha futura) para formularios de publicación */
export function useUpcomingEvents() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async (): Promise<Event[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_archived', false)
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as Event[];
    },
  });
}

// ============================================================
// Helper interno: auditoría desde el cliente (solo super_admin)
// ============================================================

async function logClientAudit(
  action: AuditAction,
  details: Record<string, unknown>,
  targetUserId?: string,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    action,
    target_user_id: targetUserId ?? null,
    details: details as Json,
  });
}

// ============================================================
// Crear evento (admin)
// ============================================================

export function useCreateEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EventInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no válida.');

      const { data, error } = await supabase
        .from('events')
        .insert({
          name: input.name,
          event_date: input.event_date,
          max_global_rentals: input.max_global_rentals,
          max_user_rentals: input.max_user_rentals,
          is_archived: input.is_archived ?? false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await logClientAudit(AuditAction.EventCreated, { event: data });
      return data;
    },
    onSuccess: () => {
      toast.success('Evento creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: Error) => toast.error(`Error al crear evento: ${error.message}`),
  });
}

// ============================================================
// Actualizar evento (admin)
// ============================================================

export function useUpdateEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, input }: { eventId: string; input: EventInput }) => {
      const { error } = await supabase
        .from('events')
        .update({
          name: input.name,
          event_date: input.event_date,
          max_global_rentals: input.max_global_rentals,
          max_user_rentals: input.max_user_rentals,
          is_archived: input.is_archived ?? false,
        })
        .eq('id', eventId);

      if (error) throw new Error(error.message);
      await logClientAudit(AuditAction.EventUpdated, { event_id: eventId, changes: input });
    },
    onSuccess: () => {
      toast.success('Evento actualizado');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: Error) => toast.error(`Error al actualizar: ${error.message}`),
  });
}

// ============================================================
// Eliminar evento (admin)
// ============================================================

export function useDeleteEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw new Error(error.message);
      await logClientAudit(AuditAction.EventDeleted, { event_id: eventId });
    },
    onSuccess: () => {
      toast.success('Evento eliminado');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: Error) => toast.error(`Error al eliminar: ${error.message}`),
  });
}