import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Cliente Supabase con service_role.
 * ¡SOLO USO EN SERVIDOR! Bypassea RLS. Nunca importar en Client Components.
 * Se usa en API routes para: tokens de aprobación, auditoría, URLs firmadas,
 * eliminación de archivos y lectura de datos sensibles controlada.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      process.env.NODE_ENV === 'development'
        ? 'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.'
        : 'Error de configuración del servidor.',
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}