import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Indica si las variables de entorno de Supabase estan presentes.
 * Si no lo estan, el cliente se crea con valores de relleno para no romper
 * el arranque de la app y la UI muestra una advertencia de configuracion.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Indica si la URL actual trae un enlace de recuperacion o invitacion de
 * Supabase. Se lee al cargar el modulo, antes de que supabase-js limpie la URL.
 */
export const esEnlaceAuth = (() => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes('type=recovery') ||
    hash.includes('type=invite') ||
    search.includes('type=recovery') ||
    search.includes('type=invite')
  );
})();

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // El retorno de OAuth y los enlaces de recuperacion/invitacion se procesan
      // manualmente en AuthProvider para garantizar que la sesion sea la del
      // usuario del enlace (y no la del usuario que ya estaba conectado).
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
