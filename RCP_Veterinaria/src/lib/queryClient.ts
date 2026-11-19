import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente de TanStack Query con tiempos de cache diferenciados por tipo de dato.
 * El inventario cambia poco (30 s) y las ventas del dia son mas volatiles (5 s).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const STALE_TIME = {
  inventario: 30_000,
  ventasDia: 5_000,
  clientes: 60_000,
  agenda: 15_000,
  publico: 60_000,
} as const;
