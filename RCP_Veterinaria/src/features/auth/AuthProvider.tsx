import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

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
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (datos: RegistroDatos) => Promise<{ requiereConfirmacion: boolean }>;
  iniciarConGoogle: () => Promise<void>;
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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCargando(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion);
    });

    return () => sub.subscription.unsubscribe();
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
      cerrarSesion: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, perfil, cargando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
