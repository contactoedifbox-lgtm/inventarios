'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { ROUTES } from '@/config/constants';
import { UserRole } from '@/types/enums';
import type { Profile } from '@/types/models';
import type { User } from '@supabase/supabase-js';

/**
 * Hook de autenticación: sesión actual + perfil desde la tabla profiles.
 * Escucha cambios de sesión de Supabase y refresca las queries.
 */

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  /** Refresca la sesión (JWT) y vuelve a leer el perfil desde la DB */
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async (): Promise<{ user: User | null; profile: Profile | null }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { user: null, profile: null };

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) return { user, profile: null };
      return { user, profile: profile as Profile };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
    // Mientras el usuario esté 'pending', consultar cada 15s para detectar
    // la aprobación del admin sin necesidad de cerrar sesión (issue #2).
    refetchInterval: (query) => {
      const profile = query.state.data?.profile;
      return profile?.role === UserRole.Pending ? 1000 * 15 : false;
    },
  });

  // Escuchar cambios de sesión (login, logout, refresh de token)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push(ROUTES.login);
    router.refresh();
  };

  const refreshProfile = async () => {
    // Renueva el JWT y fuerza la re-lectura del perfil desde la DB,
    // para que el cambio de rol se refleje de inmediato en toda la app.
    await supabase.auth.refreshSession();
    await queryClient.invalidateQueries({ queryKey: ['auth'] });
    router.refresh();
  };

  const profile = data?.profile ?? null;

  return {
    user: data?.user ?? null,
    profile,
    isLoading,
    isAuthenticated: Boolean(data?.user),
    isApproved: profile?.role === UserRole.Approved || profile?.role === UserRole.SuperAdmin,
    isSuperAdmin: profile?.role === UserRole.SuperAdmin,
    signOut,
    refreshProfile,
  };
}
