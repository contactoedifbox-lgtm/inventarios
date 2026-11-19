import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { esEnlaceAuth, isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Rol = 'maestro' | 'vendedor' | 'cliente';

export interface Perfil {
  id: string;
  nombre_completo: string;
  rol: Rol;
  activo: boolean;
}

export interface RegistroDatos {
  nombres: string;
  apellidos: string;
  rut: string;
  telefono: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  esMaestro: boolean;
  esPersonal: boolean;
  esCliente: boolean;
  modoRecuperacion: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (datos: RegistroDatos) => Promise<{ requiereConfirmacion: boolean }>;
  iniciarConGoogle: () => Promise<void>;
  recuperarClave: (email: string) => Promise<void>;
  actualizarClave: (password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * URL a la que Supabase devuelve al usuario tras OAuth o confirmacion de correo.
 * Respeta la ruta base de GitHub Pages (VITE_BASE_PATH).
 */
function urlRedireccion(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modoRecuperacion, setModoRecuperacion] = useState(esEnlaceAuth);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCargando(false);
      return;
    }

    let activo = true;

    async function inicializar() {
      const hash = window.location.hash;
      const search = window.location.search;
      const paramsHash = new URLSearchParams(hash.replace(/^#/, ''));
      const tipo = paramsHash.get('type');
      const accessToken = paramsHash.get('access_token');
      const refreshToken = paramsHash.get('refresh_token');
      const code = new URLSearchParams(search).get('code');

      // Enlaces de recuperacion/invitacion: cerramos la sesion actual para
      // garantizar que la contrasena se cambie al usuario del enlace y no al
      // usuario que ya estaba conectado (p.ej. el Maestro).
      if ((tipo === 'recovery' || tipo === 'invite') && accessToken && refreshToken) {
        await supabase.auth.signOut();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && activo) setModoRecuperacion(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (code) {
        // Retorno de OAuth (Google) con PKCE.
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const { data } = await supabase.auth.getSession();
      if (activo) setSession(data.session);
    }

    void inicializar();

    const { data: sub } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSession(nuevaSesion);
      if (evento === 'PASSWORD_RECOVERY') {
        setModoRecuperacion(true);
      }
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      if (!session?.user) {
        setPerfil(null);
        setCargando(false);
        return;
      }

      setCargando(true);
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, rol, activo')
        .eq('id', session.user.id)
        .maybeSingle();

      if (activo) {
        setPerfil((data as Perfil | null) ?? null);
        setCargando(false);
      }
    }

    void cargarPerfil();
    return () => {
      activo = false;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      perfil,
      cargando,
      esMaestro: perfil?.rol === 'maestro',
      esPersonal: perfil?.rol === 'maestro' || perfil?.rol === 'vendedor',
      esCliente: perfil?.rol === 'cliente',
      modoRecuperacion,
      iniciarSesion: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      registrarse: async (datos) => {
        const { data, error } = await supabase.auth.signUp({
          email: datos.email,
          password: datos.password,
          options: {
            emailRedirectTo: urlRedireccion(),
            data: {
              nombres: datos.nombres,
              apellidos: datos.apellidos,
              rut: datos.rut,
              telefono: datos.telefono,
              nombre_completo: `${datos.nombres} ${datos.apellidos}`.trim(),
            },
          },
        });
        if (error) throw new Error(error.message);
        // Si no hay sesion, Supabase exige confirmar el correo antes de entrar.
        return { requiereConfirmacion: !data.session };
      },
      iniciarConGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: urlRedireccion() },
        });
        if (error) throw new Error(error.message);
      },
      recuperarClave: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${urlRedireccion()}#/establecer-clave`,
        });
        if (error) throw new Error(error.message);
      },
      actualizarClave: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
        setModoRecuperacion(false);
      },
      cerrarSesion: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, perfil, cargando, modoRecuperacion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
