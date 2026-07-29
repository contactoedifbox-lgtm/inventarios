import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditAction } from '@/types/enums';
import type { Json } from '@/types/database.types';

/**
 * Logger de acciones administrativas.
 * SOLO SERVIDOR: escribe en audit_logs con service_role
 * (la política RLS de inserción requiere super_admin; el service_role
 * bypassea RLS, por lo que la autorización se valida ANTES de llamar aquí).
 */

/** Extrae la IP del cliente desde los headers de la request. */
export function getClientIp(): string | null {
  const headersList = headers();
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for puede traer una lista: "client, proxy1, proxy2"
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return headersList.get('x-real-ip');
}

export interface AuditLogEntry {
  adminId: string;
  action: AuditAction;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Registra una acción administrativa en audit_logs.
 * Si no se entrega ipAddress, se extrae automáticamente de los headers.
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  const supabase = createAdminClient();
  const ip = entry.ipAddress ?? getClientIp();

  const { error } = await supabase.from('audit_logs').insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    details: (entry.details ?? {}) as Json,
    ip_address: ip,
  });

  if (error) {
    // No lanzar: un fallo de auditoría no debe romper la operación principal,
    // pero sí quedar registrado en logs del servidor.
    console.error('[audit] Error al registrar acción administrativa:', error.message);
  }
}