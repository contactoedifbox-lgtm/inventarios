'use client';

import { create } from 'zustand';
import type { CostumeType } from '@/types/enums';

/**
 * Estado UI global mínimo (Zustand).
 * Solo estado de interfaz compartido entre componentes:
 * filtros del catálogo y paginación. El estado del servidor
 * (datos) vive en TanStack Query, NO aquí.
 */

interface CatalogFiltersState {
  search: string;
  eventId: string | null;
  page: number;
  setSearch: (search: string) => void;
  setEventId: (eventId: string | null) => void;
  setPage: (page: number) => void;
  reset: (type?: CostumeType) => void;
}

const initialState = {
  search: '',
  eventId: null,
  page: 1,
};

export const useCatalogFiltersStore = create<CatalogFiltersState>((set) => ({
  ...initialState,
  setSearch: (search) => set({ search, page: 1 }), // reset página al filtrar
  setEventId: (eventId) => set({ eventId, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(initialState),
}));

interface MobileNavState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useMobileNavStore = create<MobileNavState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));