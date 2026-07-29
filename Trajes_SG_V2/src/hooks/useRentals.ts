'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { RentalStatus } from '@/types/enums';
import type { Costume, Event, PublicProfile, RentalWithDetails } from '@/types/models';
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
  voucher_path: string | null;
  status: RentalStatus;
  created_at: string;
  updated_at: string;
  costume: Costume;
  event: Event;
  renter: PublicProfile | null;
}

function mapRental(row: RentalRowWithJoins): RentalWithDetails {
  return {
    ...row,
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

      // Trajes del usuario → rentals de esos trajes
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