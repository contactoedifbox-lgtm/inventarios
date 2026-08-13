'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PAGE_SIZE } from '@/config/constants';
import { CostumeStatus, CostumeType, ListingType } from '@/types/enums';
import type {
  Costume,
  CostumeFilters,
  CostumeWithOwner,
  Event,
  PaginatedResult,
  PublicProfile,
} from '@/types/models';
import type { TablesUpdate } from '@/types/database.types';
import type { CostumeInput } from '@/lib/validations/costume.schema';

/**
 * Hooks del catálogo de trajes y gestión de publicaciones del usuario.
 * Datos del servidor via TanStack Query (caché, revalidación automática).
 */

// ============================================================
// Catálogo público (paginación del lado del servidor)
// ============================================================

interface CostumeRowWithJoins extends Costume {
  owner: PublicProfile;
  costume_events: { events: Event }[];
}

export function useCostumes(filters: CostumeFilters) {
  const supabase = createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  return useQuery({
    queryKey: ['costumes', 'catalog', filters],
    queryFn: async (): Promise<PaginatedResult<CostumeWithOwner>> => {
      let query = supabase
        .from('costumes')
        .select(
          `
          *,
          owner:profiles!costumes_owner_profiles_fkey(id, full_name, city),
          costume_events(events(*))
        `,
          { count: 'exact' },
        )
        .eq('is_sold', false)
        .order('created_at', { ascending: false });

      if (filters.type) query = query.eq('type', filters.type);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) {
        query = query.or(
          `size.ilike.%${filters.search}%,year.ilike.%${filters.search}%`,
        );
      }
      if (filters.eventId) {
        // Filtrar trajes asociados al evento (vía costume_events)
        const { data: ce } = await supabase
          .from('costume_events')
          .select('costume_id')
          .eq('event_id', filters.eventId);
        const ids = (ce ?? []).map((row) => row.costume_id);
        if (ids.length === 0) {
          return { data: [], count: 0, page, pageSize, totalPages: 0 };
        }
        query = query.in('id', ids);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as CostumeRowWithJoins[];
      const mapped: CostumeWithOwner[] = rows.map((row) => ({
        ...row,
        owner: row.owner,
        events: (row.costume_events ?? []).map((ce) => ce.events).filter(Boolean),
      }));

      const total = count ?? 0;
      return {
        data: mapped,
        count: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    placeholderData: (previous) => previous, // keepPreviousData al cambiar página
  });
}

// ============================================================
// Trajes del usuario autenticado
// ============================================================

export function useMyCostumes(type?: CostumeType) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['costumes', 'mine', type],
    queryFn: async (): Promise<CostumeWithOwner[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('costumes')
        .select(
          `
          *,
          owner:profiles!costumes_owner_profiles_fkey(id, full_name, city),
          costume_events(events(*))
        `,
        )
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (type) query = query.eq('type', type);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as CostumeRowWithJoins[];
      return rows.map((row) => ({
        ...row,
        owner: row.owner,
        events: (row.costume_events ?? []).map((ce) => ce.events).filter(Boolean),
      }));
    },
  });
}

// ============================================================
// Crear traje (+ asociar eventos si es de arriendo o ambos)
// ============================================================

export function useCreateCostume() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CostumeInput & { image_paths: string[] }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión para publicar.');

      // Insertar el traje con TODOS los campos
      const { data: costume, error } = await supabase
        .from('costumes')
        .insert({
          owner_id: user.id,
          type: input.type,
          year: input.year,
          size: input.size,
          boot_size: input.boot_size,
          price: input.price,
          bank_info: input.bank_info,
          image_paths: input.image_paths,
          status: CostumeStatus.Disponible,
          // Campos nuevos que antes faltaban:
          listing_type: input.listing_type,
          rental_price: input.rental_price,
          sale_price: input.sale_price,
          character_type: input.character_type,
          bell_count: input.bell_count,
          includes_accessories: input.includes_accessories,
          agrupacion: input.agrupacion,
        })
        .select()
        .single();

      if (error) {
        console.error('Error insertando traje:', error);
        throw new Error(error.message || 'No se pudo guardar el traje. Revisa los datos.');
      }

      if (!costume) {
        throw new Error('El traje se creó pero no se pudo recuperar el registro.');
      }

      // Asociar eventos (solo si NO es venta pura)
      const needsEvents = input.listing_type === ListingType.Arriendo || input.listing_type === ListingType.Ambos;
      if (needsEvents && input.event_ids.length > 0) {
        const { error: ceError } = await supabase.from('costume_events').insert(
          input.event_ids.map((eventId) => ({
            costume_id: costume.id,
            event_id: eventId,
          })),
        );
        if (ceError) {
          console.error('Error asociando eventos:', ceError);
          throw new Error(`El traje se creó pero no se pudieron asociar los eventos: ${ceError.message}`);
        }
      }

      return costume;
    },
    onSuccess: () => {
      toast.success('Traje publicado correctamente');
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al publicar: ${error.message}`);
    },
  });
}

// ============================================================
// Actualizar traje
// ============================================================

export function useUpdateCostume() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      costumeId,
      input,
    }: {
      costumeId: string;
      input: Partial<CostumeInput> & { image_paths?: string[] };
    }) => {
      const { event_ids, image_paths, ...rest } = input;

      const updateData: TablesUpdate<'costumes'> = { ...rest };
      if (image_paths) updateData.image_paths = image_paths;

      const { error } = await supabase
        .from('costumes')
        .update(updateData)
        .eq('id', costumeId);
      if (error) throw new Error(error.message);

      // Sincronizar eventos si se entregaron
      if (event_ids !== undefined) {
        const { error: delError } = await supabase
          .from('costume_events')
          .delete()
          .eq('costume_id', costumeId);
        if (delError) throw new Error(delError.message);

        if (event_ids.length > 0) {
          const { error: insError } = await supabase.from('costume_events').insert(
            event_ids.map((eventId) => ({ costume_id: costumeId, event_id: eventId })),
          );
          if (insError) throw new Error(insError.message);
        }
      }
    },
    onSuccess: () => {
      toast.success('Traje actualizado');
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });
}

// ============================================================
// Eliminar traje
// ============================================================

export function useDeleteCostume() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (costumeId: string) => {
      const { error } = await supabase.from('costumes').delete().eq('id', costumeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Traje eliminado');
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });
}
