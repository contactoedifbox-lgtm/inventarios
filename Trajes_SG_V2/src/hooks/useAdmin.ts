'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PAGE_SIZE } from '@/config/constants';
import { UserRole } from '@/types/enums';
import type {
  AuditLogWithAdmin,
  PaginatedResult,
  Profile,
  PublicProfile,
} from '@/types/models';
import type { AdminUserActionInput } from '@/lib/validations/user.schema';
import type { Json } from '@/types/database.types';

/**
 * Hooks del panel de administración.
 * Las acciones sobre usuarios pasan por API routes (service_role)
 * porque implican emails, storage y borrado de auth.users.
 */

// ============================================================
// Usuarios pendientes de aprobación
// ============================================================

export function usePendingUsers() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', UserRole.Pending)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Profile[];
    },
  });
}

// ============================================================
// Todos los usuarios (paginado + filtro por rol)
// ============================================================

export function useUsers(page = 1, role?: UserRole, pageSize = DEFAULT_PAGE_SIZE) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin', 'users', 'all', { page, role, pageSize }],
    queryFn: async (): Promise<PaginatedResult<Profile>> => {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (role) query = query.eq('role', role);

      const from = (page - 1) * pageSize;
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        data: (data ?? []) as unknown as Profile[],
        count: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    placeholderData: (previous) => previous,
  });
}

// ============================================================
// Acciones sobre usuarios (API route con service_role)
// ============================================================

export function useUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      action,
    }: {
      userId: string;
      action: AdminUserActionInput;
    }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'Error al procesar la acción');
      }
      return body;
    },
    onSuccess: (_data, variables) => {
      const messages: Record<AdminUserActionInput['action'], string> = {
        approve: 'Usuario aprobado correctamente',
        reject: 'Usuario rechazado',
        suspend: 'Usuario suspendido',
        reactivate: 'Usuario reactivado',
        delete: 'Usuario eliminado',
      };
      toast.success(messages[variables.action.action]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================
// Logs de auditoría (paginados)
// ============================================================

interface AuditRowWithJoins {
  id: string;
  admin_id: string;
  action: AuditLogWithAdmin['action'];
  target_user_id: string | null;
  details: Json;
  ip_address: string | null;
  created_at: string;
  admin: PublicProfile | null;
  target_user: PublicProfile | null;
}

export function useAuditLogs(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin', 'audit', { page, pageSize }],
    queryFn: async (): Promise<PaginatedResult<AuditLogWithAdmin>> => {
      const from = (page - 1) * pageSize;

      const { data, error, count } = await supabase
        .from('audit_logs')
        .select(
          `
          *,
          admin:profiles!audit_logs_admin_profiles_fkey(id, full_name, city),
          target_user:profiles!audit_logs_target_profiles_fkey(id, full_name, city)
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as AuditRowWithJoins[];
      const mapped: AuditLogWithAdmin[] = rows.map((row) => ({
        ...row,
        details: (row.details ?? {}) as Record<string, unknown>,
        admin: row.admin ?? { id: row.admin_id, full_name: 'Desconocido', city: '' },
        target_user: row.target_user,
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
    placeholderData: (previous) => previous,
  });
}

// ============================================================
// Estadísticas del dashboard admin
// ============================================================

export interface AdminStats {
  pendingUsers: number;
  approvedUsers: number;
  totalCostumes: number;
  activeRentals: number;
  totalEvents: number;
}

export function useAdminStats() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
      const [pending, approved, costumes, rentals, events] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', UserRole.Pending),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', UserRole.Approved),
        supabase
          .from('costumes')
          .select('id', { count: 'exact', head: true })
          .eq('is_sold', false),
        supabase.from('rentals').select('id', { count: 'exact', head: true }),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false),
      ]);

      return {
        pendingUsers: pending.count ?? 0,
        approvedUsers: approved.count ?? 0,
        totalCostumes: costumes.count ?? 0,
        activeRentals: rentals.count ?? 0,
        totalEvents: events.count ?? 0,
      };
    },
  });
}

// ============================================================
// NUEVA FUNCIÓN - Auditoría de Carnet (App A style)
// ============================================================

export function useLogCarnetAccess() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      viewerId,
      viewerName,
      viewerRole,
      targetUserId,
      targetUserName,
      photoType,
    }: {
      viewerId: string;
      viewerName: string;
      viewerRole: string;
      targetUserId: string;
      targetUserName: string;
      photoType: 'frente' | 'trasera' | 'ambas';
    }) => {
      const { error } = await supabase.from('carnet_access_logs').insert({
        viewer_id: viewerId,
        viewer_name: viewerName,
        viewer_role: viewerRole,
        target_user_id: targetUserId,
        target_user_name: targetUserName,
        photo_type: photoType,
        timestamp: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
    },
    onError: (error: Error) => {
      console.error('Error al registrar auditoría de carnet:', error);
    },
  });
}

// ============================================================
// Obtener logs de auditoría de carnet
// ============================================================

export function useCarnetAccessLogs() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin', 'carnet-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carnet_access_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: false, // Solo se activa cuando se llama explícitamente
  });
}
