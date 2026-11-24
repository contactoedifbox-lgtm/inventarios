import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { STALE_TIME } from './queryClient';
import type { ItemVenta, MedioPago, Reserva } from './types';

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------
export function useInventario(busqueda: string) {
  return useQuery({
    queryKey: ['inventario', busqueda],
    queryFn: () => api.listarInventario(busqueda),
    staleTime: STALE_TIME.inventario,
  });
}

export function useCrearProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.ProductoInput) => api.crearProducto(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  });
}

export function useActualizarProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.ProductoInput }) =>
      api.actualizarProducto(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  });
}

export function useRegistrarIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { producto_id: string; cantidad: number }[]) =>
      api.registrarIngreso(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  });
}

export function useAjustarStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productoId,
      nuevoStock,
      motivo,
    }: {
      productoId: string;
      nuevoStock: number;
      motivo: string;
    }) => api.ajustarStock(productoId, nuevoStock, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  });
}

export function useGuardarCosto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productoId, costoNeto }: { productoId: string; costoNeto: number }) =>
      api.guardarCosto(productoId, costoNeto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  });
}

export function useIva() {
  return useQuery({
    queryKey: ['iva'],
    queryFn: api.obtenerIva,
    staleTime: STALE_TIME.clientes,
  });
}

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------
export function useVentas(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['ventas', desde, hasta],
    queryFn: () => api.listarVentas(desde, hasta),
    staleTime: STALE_TIME.ventasDia,
  });
}

export function useRegistrarVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      items,
      medioPago,
      descuento,
      descripcionDescuento,
    }: {
      items: ItemVenta[];
      medioPago: MedioPago;
      descuento?: number;
      descripcionDescuento?: string | null;
    }) => api.registrarVenta(items, medioPago, descuento, descripcionDescuento),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

export function useRegistrarDevolucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      items,
      medioPago,
      motivo,
      ventaOrigenId,
    }: {
      items: ItemVenta[];
      medioPago: MedioPago;
      motivo: string;
      ventaOrigenId?: string | null;
    }) => api.registrarDevolucion(items, medioPago, motivo, ventaOrigenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

export function useAnularVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ventaId, motivo }: { ventaId: string; motivo: string }) =>
      api.anularVenta(ventaId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export function useClientes(busqueda: string) {
  return useQuery({
    queryKey: ['clientes', busqueda],
    queryFn: () => api.listarClientes(busqueda),
    staleTime: STALE_TIME.clientes,
  });
}

export function useCrearCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.ClienteInput) => api.crearCliente(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------
export function useProfesionales() {
  return useQuery({
    queryKey: ['profesionales'],
    queryFn: api.listarProfesionales,
    staleTime: STALE_TIME.agenda,
  });
}

export function useReservas(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['reservas', desde, hasta],
    queryFn: () => api.listarReservas(desde, hasta),
    staleTime: STALE_TIME.agenda,
  });
}

export function useCrearReservaInterna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.ReservaInternaInput) => api.crearReservaInterna(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas'] });
      qc.invalidateQueries({ queryKey: ['reservas-dia'] });
      qc.invalidateQueries({ queryKey: ['agenda-ocupacion'] });
      qc.invalidateQueries({ queryKey: ['reservas-resumen'] });
    },
  });
}

export function useCambiarEstadoReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservaId,
      estado,
      motivo,
    }: {
      reservaId: string;
      estado: Reserva['estado'];
      motivo?: string;
    }) => api.cambiarEstadoReserva(reservaId, estado, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas'] });
      qc.invalidateQueries({ queryKey: ['reservas-dia'] });
      qc.invalidateQueries({ queryKey: ['agenda-ocupacion'] });
      qc.invalidateQueries({ queryKey: ['reservas-resumen'] });
      qc.invalidateQueries({ queryKey: ['mis-reservas'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------
export function useReporte(desde: string, hasta: string, agrupar: 'dia' | 'semana' | 'mes') {
  return useQuery({
    queryKey: ['reporte', desde, hasta, agrupar],
    queryFn: () => api.reporteVentas(desde, hasta, agrupar),
    staleTime: STALE_TIME.ventasDia,
  });
}

// ---------------------------------------------------------------------------
// Publico
// ---------------------------------------------------------------------------
export function useProfesionalesPublicos() {
  return useQuery({
    queryKey: ['profesionales-publicos'],
    queryFn: api.profesionalesPublicos,
    staleTime: STALE_TIME.publico,
  });
}

export function useConfigPublica() {
  return useQuery({
    queryKey: ['config-publica'],
    queryFn: api.configPublica,
    staleTime: STALE_TIME.publico,
  });
}

export function useHorariosDisponibles(
  profesionalId: string | null,
  desde: string,
  hasta: string,
  ignorarAnticipacion = false,
) {
  return useQuery({
    queryKey: ['horarios', profesionalId, desde, hasta, ignorarAnticipacion],
    queryFn: () =>
      api.horariosDisponibles(profesionalId as string, desde, hasta, ignorarAnticipacion),
    enabled: Boolean(profesionalId),
    staleTime: STALE_TIME.publico,
  });
}

export function useCrearReservaPublica() {
  return useMutation({
    mutationFn: (payload: api.ReservaPublicaPayload) => api.crearReservaPublica(payload),
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function useDashboard(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['dashboard', desde, hasta],
    queryFn: () => api.dashboardResumen(desde, hasta),
    staleTime: STALE_TIME.ventasDia,
  });
}

export function useReservasResumen() {
  return useQuery({
    queryKey: ['reservas-resumen'],
    queryFn: api.reservasResumen,
    staleTime: STALE_TIME.agenda,
  });
}

// ---------------------------------------------------------------------------
// Detalle de venta y devoluciones
// ---------------------------------------------------------------------------
export function useVentaDetalle(ventaId: string | null) {
  return useQuery({
    queryKey: ['venta-detalle', ventaId],
    queryFn: () => api.obtenerVentaDetalle(ventaId as string),
    enabled: Boolean(ventaId),
    staleTime: 0,
  });
}

// ---------------------------------------------------------------------------
// Clientes con mascotas
// ---------------------------------------------------------------------------
export function useClientesConMascotas(busqueda: string) {
  return useQuery({
    queryKey: ['clientes-mascotas', busqueda],
    queryFn: () => api.listarClientesConMascotas(busqueda),
    staleTime: STALE_TIME.clientes,
  });
}

export function useCrearMascota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.MascotaInput) => api.crearMascota(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['clientes-mascotas'] });
      qc.invalidateQueries({ queryKey: ['mascotas'] });
      qc.invalidateQueries({ queryKey: ['mis-datos'] });
    },
  });
}

export function useMascotasCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['mascotas', clienteId],
    queryFn: () => api.listarMascotasCliente(clienteId as string),
    enabled: Boolean(clienteId),
    staleTime: STALE_TIME.clientes,
  });
}

// ---------------------------------------------------------------------------
// Agenda extendida
// ---------------------------------------------------------------------------
export function useHorariosSemanales() {
  return useQuery({
    queryKey: ['horarios-semanales'],
    queryFn: api.listarHorariosSemanales,
    staleTime: STALE_TIME.agenda,
  });
}

export function useExcepciones(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['excepciones', desde, hasta],
    queryFn: () => api.listarExcepciones(desde, hasta),
    staleTime: STALE_TIME.agenda,
  });
}

export function useReservasDia(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['reservas-dia', desde, hasta],
    queryFn: () => api.listarReservasDia(desde, hasta),
    staleTime: STALE_TIME.agenda,
  });
}

export function useAgendaOcupacion(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['agenda-ocupacion', desde, hasta],
    queryFn: () => api.agendaOcupacion(desde, hasta),
    staleTime: STALE_TIME.agenda,
  });
}

// ---------------------------------------------------------------------------
// Profesionales (gestion)
// ---------------------------------------------------------------------------
export function useProfesionalesTodos() {
  return useQuery({
    queryKey: ['profesionales-todos'],
    queryFn: api.listarProfesionalesTodos,
    staleTime: STALE_TIME.agenda,
  });
}

export function useCrearProfesional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.ProfesionalInput) => api.crearProfesional(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profesionales'] });
      qc.invalidateQueries({ queryKey: ['profesionales-todos'] });
    },
  });
}

export function useActualizarProfesional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.ProfesionalInput }) =>
      api.actualizarProfesional(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profesionales'] });
      qc.invalidateQueries({ queryKey: ['profesionales-todos'] });
    },
  });
}

export function useCrearHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.HorarioInput) => api.crearHorario(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios-semanales'] });
      qc.invalidateQueries({ queryKey: ['horarios'] });
    },
  });
}

export function useEliminarHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.eliminarHorario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios-semanales'] });
      qc.invalidateQueries({ queryKey: ['horarios'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Ranking de productos
// ---------------------------------------------------------------------------
export function useRanking(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['ranking', desde, hasta],
    queryFn: () => api.rankingProductos(desde, hasta),
    staleTime: STALE_TIME.ventasDia,
  });
}

// ---------------------------------------------------------------------------
// Reservas de productos
// ---------------------------------------------------------------------------
export function useReservasProducto() {
  return useQuery({
    queryKey: ['reservas-producto'],
    queryFn: api.listarReservasProducto,
    staleTime: STALE_TIME.inventario,
  });
}

export function useCrearReservaProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productoId,
      cantidad,
      notas,
    }: {
      productoId: string;
      cantidad: number;
      notas?: string;
    }) => api.crearReservaProducto(productoId, cantidad, notas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas-producto'] }),
  });
}

export function useCancelarReservaProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelarReservaProducto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas-producto'] }),
  });
}

export function useMarcarReservaRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.marcarReservaRetirada(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas-producto'] }),
  });
}

// ---------------------------------------------------------------------------
// Reservas de hora del cliente
// ---------------------------------------------------------------------------
export function useMisReservas() {
  return useQuery({
    queryKey: ['mis-reservas'],
    queryFn: api.listarMisReservas,
    staleTime: STALE_TIME.agenda,
  });
}

export function useMisDatos() {
  return useQuery({
    queryKey: ['mis-datos'],
    queryFn: api.misDatos,
    staleTime: STALE_TIME.clientes,
  });
}

export function useActualizarMisDatos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.MisDatosInput) => api.actualizarMisDatos(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-datos'] });
      qc.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useCrearReservaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      profesionalId,
      mascotaId,
      inicio,
      motivo,
    }: {
      profesionalId: string;
      mascotaId: string | null;
      inicio: string;
      motivo?: string;
    }) => api.crearReservaCliente(profesionalId, mascotaId, inicio, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-reservas'] });
      qc.invalidateQueries({ queryKey: ['reservas-dia'] });
      qc.invalidateQueries({ queryKey: ['agenda-ocupacion'] });
      qc.invalidateQueries({ queryKey: ['reservas-resumen'] });
    },
  });
}

export function useCancelarMiReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      api.cancelarMiReserva(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-reservas'] });
      qc.invalidateQueries({ queryKey: ['reservas-dia'] });
      qc.invalidateQueries({ queryKey: ['agenda-ocupacion'] });
      qc.invalidateQueries({ queryKey: ['reservas-resumen'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Encargos de productos
// ---------------------------------------------------------------------------
export function useEncargos() {
  return useQuery({
    queryKey: ['encargos'],
    queryFn: api.listarEncargos,
    staleTime: STALE_TIME.agenda,
  });
}

export function useCrearEncargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productoId,
      cantidad,
      notas,
    }: {
      productoId: string;
      cantidad: number;
      notas?: string | null;
    }) => api.crearEncargoProducto(productoId, cantidad, notas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encargos'] }),
  });
}

export function useCambiarEstadoEncargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      estado,
    }: {
      id: string;
      estado: 'pendiente' | 'entregado' | 'cancelado';
    }) => api.cambiarEstadoEncargo(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encargos'] }),
  });
}

// ---------------------------------------------------------------------------
// Eliminar clientes y profesionales / invitar usuarios
// ---------------------------------------------------------------------------
export function useEliminarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.eliminarCliente(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['clientes-mascotas'] });
      qc.invalidateQueries({ queryKey: ['reservas-dia'] });
      qc.invalidateQueries({ queryKey: ['reservas-resumen'] });
    },
  });
}

export function useEliminarProfesional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.eliminarProfesional(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profesionales'] });
      qc.invalidateQueries({ queryKey: ['profesionales-todos'] });
      qc.invalidateQueries({ queryKey: ['horarios-semanales'] });
      qc.invalidateQueries({ queryKey: ['reservas-dia'] });
    },
  });
}

export function useInvitarUsuario() {
  return useMutation({
    mutationFn: (input: api.InvitarUsuarioInput) => api.invitarUsuario(input),
  });
}

export function useVincularPerfilProfesional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profesionalId, perfilId }: { profesionalId: string; perfilId: string }) =>
      api.vincularPerfilProfesional(profesionalId, perfilId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profesionales'] });
      qc.invalidateQueries({ queryKey: ['profesionales-todos'] });
    },
  });
}
