import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Indica si las variables de entorno de Supabase estan presentes.
 * Si no lo estan, el cliente se crea con valores de relleno para no romper
 * el arranque de la app y la UI muestra una advertencia de configuracion.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
