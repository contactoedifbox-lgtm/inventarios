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
 * Datos del enlace de autenticacion presentes en la URL al cargar la app
 * (recuperacion/invitacion con tokens en el fragmento, u OAuth con ?code=).
 *
 * Se leen al cargar el modulo, ANTES de que el HashRouter consuma el fragmento
 * (el router reemplaza `#access_token=...` por `#/` y perderia el token).
 */
export type EnlaceAuth =
  | { kind: 'tokens'; tipo: string; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | null;

export const enlaceAuth: EnlaceAuth = (() => {
  if (typeof window === 'undefined') return null;

  const paramsHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const tipo = paramsHash.get('type');
  const accessToken = paramsHash.get('access_token');
  const refreshToken = paramsHash.get('refresh_token');
  const code = new URLSearchParams(window.location.search).get('code');

  if ((tipo === 'recovery' || tipo === 'invite') && accessToken && refreshToken) {
    return { kind: 'tokens', tipo, accessToken, refreshToken };
  }
  if (code) {
    return { kind: 'code', code };
  }
  return null;
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
