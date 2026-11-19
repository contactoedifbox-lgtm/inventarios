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

interface AuthContextValue {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  esMaestro: boolean;
  esPersonal: boolean;
  esCliente: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
