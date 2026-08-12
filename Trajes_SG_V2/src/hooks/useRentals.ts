'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { QueueStatus } from '@/types/enums';
import type { Costume, Event, PublicProfile, RentalWithDetails, RentalQueue, RentalRequest } from '@/types/models';
import type { ContactInfoInput } from '@/lib/validations/auth.schema';

/**
 * Hooks de arriendos: solicitudes del usuario y solicitudes recibidas
 * (como dueño de trajes). La creación y confirmación pasan por API
 * routes (validación de límites y reglas de negocio en servidor).
 */

interface RentalRowWithJoins {
  id: string;
  costume_id: string;
  renter_id: string;
  first_name: string;
  last_name: string;
  rut: string;
  phone: string;
  email: string;
  event_id: string;
  event_name: string | null;
  voucher_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  costume: Costume;
  event: Event;
  renter: PublicProfile | null;
}

function mapRental(row: RentalRowWithJoins): RentalWithDetails {
  return {
    ...row,
    event_name: row.event_name ?? undefined,
    status: row.status as 'reservado' | 'arrendado',
    costume: row.costume,
    event: row.event,
    renter: row.renter ?? { id: row.renter_id, full_name: 'Usuario', city: '' },
  };
}

const RENTAL_SELECT = `
  *,
  costume:costumes(*),
  event:events(*),
  renter:profiles!rentals_renter_profiles_fkey(id, full_name, city)
`;

// ============================================================
// Mis solicitudes de arriendo (como arrendatario)
// ============================================================

export function useMyRentals() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['rentals', 'mine'],
    queryFn: async (): Promise<RentalWithDetails[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('rentals')
        .select(RENTAL_SELECT)
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as RentalRowWithJoins[]).map(mapRental);
    },
  });
}

// ============================================================
// Solicitudes recibidas (como dueño de trajes)
// ============================================================

export function useReceivedRentals() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['rentals', 'received'],
    queryFn: async (): Promise<RentalWithDetails[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: myCostumes, error: costumesError } = await supabase
        .from('costumes')
        .select('id')
        .eq('owner_id', user.id);

      if (costumesError) throw new Error(costumesError.message);
      const costumeIds = (myCostumes ?? []).map((c) => c.id);
      if (costumeIds.length === 0) return [];

      const { data, error } = await supabase
        .from('rentals')
        .select(RENTAL_SELECT)
        .in('costume_id', costumeIds)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as RentalRowWithJoins[]).map(mapRental);
    },
  });
}

// ============================================================
// Crear solicitud de arriendo (API route con validación de límites)
// ============================================================

export interface CreateRentalPayload extends ContactInfoInput {
  costume_id: string;
  event_id: string;
}

export function useCreateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRentalPayload) => {
      const response = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as {
        ok: boolean;
        rental_id?: string;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'No se pudo crear la solicitud de arriendo');
      }
      return body;
    },
    onSuccess: () => {
      toast.success('Solicitud de arriendo enviada. El traje quedó reservado.');
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================
// Confirmar arriendo (dueño del traje, vía API route)
// ============================================================

export function useConfirmRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rentalId: string) => {
      const response = await fetch(`/api/rentals/${rentalId}/confirm`, {
        method: 'PATCH',
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'No se pudo confirmar el arriendo');
      }
      return body;
    },
    onSuccess: () => {
      toast.success('Arriendo confirmado');
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================
// Subir comprobante de pago (voucher) — bucket privado 'vouchers'
// ============================================================

export function useUploadRentalVoucher() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rentalId, file }: { rentalId: string; file: Blob }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no válida.');

      const path = `${user.id}/rental-${rentalId}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('vouchers')
        .upload(path, file, { contentType: 'image/webp', upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase
        .from('rentals')
        .update({ voucher_path: path })
        .eq('id', rentalId);

      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => {
      toast.success('Comprobante subido correctamente');
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
    onError: (error: Error) => toast.error(`Error al subir comprobante: ${error.message}`),
  });
}

// ============================================================
// NUEVAS FUNCIONES - COLA DE ARRIENDO (App A style)
// ============================================================

// ---------- Obtener la cola de un traje ----------
export function useRentalQueue(suitId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['rental-queue', suitId],
    queryFn: async (): Promise<RentalQueue[]> => {
      const { data, error } = await supabase
        .from('rental_queue')
        .select('*')
        .eq('suit_id', suitId)
        .order('order_index', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as RentalQueue[];
    },
    enabled: Boolean(suitId),
  });
}

// ---------- Crear solicitud de arriendo (cola) ----------
export interface CreateQueueRequestPayload {
  suitId: string;
  renterId: string;
  renterName: string;
  renterEmail: string;
  ownerId: string;
  ownerName: string;
  eventName: string;
  actionType: 'Reserva' | 'Arriendo';
}

export function useCreateQueueRequest() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateQueueRequestPayload) => {
      const { data, error } = await supabase.rpc('create_rental_request', {
        p_suit_id: payload.suitId,
        p_renter_id: payload.renterId,
        p_renter_name: payload.renterName,
        p_renter_email: payload.renterEmail,
        p_owner_id: payload.ownerId,
        p_owner_name: payload.ownerName,
        p_event_name: payload.eventName,
        p_action_type: payload.actionType,
      });

      if (error) {
        const message = error.message.includes('raise_exception')
          ? error.message.split('raise_exception')[1]?.trim() || error.message
          : error.message;
        throw new Error(message);
      }

      return data as string;
    },
    onSuccess: (_, variables) => {
      toast.success('Solicitud enviada al propietario');
      queryClient.invalidateQueries({ queryKey: ['rental-queue'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'No se pudo crear la solicitud');
    },
  });
}

// ---------- Confirmar disponibilidad (propietario) ----------
export function useConfirmAvailability() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, suitId }: { requestId: string; suitId: string }) => {
      const { error } = await supabase.rpc('confirm_availability', {
        p_request_id: requestId,
        p_suit_id: suitId,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Disponibilidad confirmada. El arrendatario tiene 24h para pagar.');
      queryClient.invalidateQueries({ queryKey: ['rental-queue'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al confirmar disponibilidad');
    },
  });
}

// ---------- Rechazar disponibilidad (propietario) ----------
export function useRejectAvailability() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, suitId }: { requestId: string; suitId: string }) => {
      const { error } = await supabase.rpc('reject_availability', {
        p_request_id: requestId,
        p_suit_id: suitId,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Disponibilidad rechazada. El traje vuelve a estar disponible.');
      queryClient.invalidateQueries({ queryKey: ['rental-queue'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al rechazar disponibilidad');
    },
  });
}

// ---------- Confirmar pago (propietario) ----------
export function useConfirmPayment() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, suitId }: { requestId: string; suitId: string }) => {
      const { error } = await supabase.rpc('confirm_payment', {
        p_request_id: requestId,
        p_suit_id: suitId,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Pago confirmado. El arriendo está activo.');
      queryClient.invalidateQueries({ queryKey: ['rental-queue'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al confirmar pago');
    },
  });
}

// ---------- Obtener solicitudes de un usuario ----------
export function useMyQueueRequests() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['rental-queue', 'mine'],
    queryFn: async (): Promise<RentalQueue[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('rental_queue')
        .select('*')
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as RentalQueue[];
    },
  });
}

// ---------- Obtener solicitudes recibidas (como dueño) ----------
export function useReceivedQueueRequests() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['rental-queue', 'received'],
    queryFn: async (): Promise<RentalQueue[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('rental_queue')
        .select('*')
        .eq('owner_id', user.id)
        .order('order_index', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as RentalQueue[];
    },
  });
}

// ---------- Cancelar solicitud ----------
export function useCancelQueueRequest() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('rental_queue')
        .update({ status: 'Cancelado', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Solicitud cancelada');
      queryClient.invalidateQueries({ queryKey: ['rental-queue'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cancelar solicitud');
    },
  });
}
