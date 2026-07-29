'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { SaleStatus } from '@/types/enums';
import type { Costume, PublicProfile, SaleWithDetails } from '@/types/models';
import type { ContactInfoInput } from '@/lib/validations/auth.schema';

/**
 * Hooks de ventas: compras del usuario y solicitudes recibidas (dueño).
 * La creación y confirmación pasan por API routes (reglas de negocio
 * y soft-delete del traje en servidor).
 */

interface SaleRowWithJoins {
  id: string;
  costume_id: string;
  buyer_id: string;
  first_name: string;
  last_name: string;
  rut: string;
  phone: string;
  email: string;
  voucher_path: string | null;
  status: SaleStatus;
  created_at: string;
  updated_at: string;
  costume: Costume;
  buyer: PublicProfile | null;
}

function mapSale(row: SaleRowWithJoins): SaleWithDetails {
  return {
    ...row,
    costume: row.costume,
    buyer: row.buyer ?? { id: row.buyer_id, full_name: 'Usuario', city: '' },
  };
}

const SALE_SELECT = `
  *,
  costume:costumes(*),
  buyer:profiles!sales_buyer_profiles_fkey(id, full_name, city)
`;

// Mis compras (como comprador)
export function useMySales() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['sales', 'mine'],
    queryFn: async (): Promise<SaleWithDetails[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(SALE_SELECT)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as SaleRowWithJoins[]).map(mapSale);
    },
  });
}

// Solicitudes de compra recibidas (como dueño)
export function useReceivedSales() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['sales', 'received'],
    queryFn: async (): Promise<SaleWithDetails[]> => {
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
        .from('sales')
        .select(SALE_SELECT)
        .in('costume_id', costumeIds)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as SaleRowWithJoins[]).map(mapSale);
    },
  });
}

// Crear solicitud de compra (API route)
export interface CreateSalePayload extends ContactInfoInput {
  costume_id: string;
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as {
        ok: boolean;
        sale_id?: string;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'No se pudo crear la solicitud de compra');
      }
      return body;
    },
    onSuccess: () => {
      toast.success('Solicitud de compra enviada. El traje quedó reservado.');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Confirmar venta (dueño, vía API route → soft delete del traje)
export function useConfirmSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const response = await fetch(`/api/sales/${saleId}/confirm`, {
        method: 'PATCH',
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'No se pudo confirmar la venta');
      }
      return body;
    },
    onSuccess: () => {
      toast.success('Venta confirmada. El traje ya no se mostrará en el catálogo.');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['costumes'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Subir comprobante de compra — bucket privado 'vouchers'
export function useUploadSaleVoucher() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, file }: { saleId: string; file: Blob }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no válida.');

      const path = `${user.id}/sale-${saleId}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('vouchers')
        .upload(path, file, { contentType: 'image/webp', upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase
        .from('sales')
        .update({ voucher_path: path })
        .eq('id', saleId);

      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => {
      toast.success('Comprobante subido correctamente');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error: Error) => toast.error(`Error al subir comprobante: ${error.message}`),
  });
}
