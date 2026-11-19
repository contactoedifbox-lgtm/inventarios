import { supabase } from './supabase';
import type {
  AgendaOcupacion,
  MiReserva,
  MisDatos,
  ReservaProducto,
  Cliente,
  ClienteConMascotas,
  ConfigPublica,
  DashboardResumen,
  ExcepcionAgenda,
  HorarioSemanal,
  ItemVenta,
  MascotaResumen,
  MedioPago,
  Profesional,
  ProfesionalPublico,
  ProductoInventario,
  RankingProducto,
  ReporteFila,
  Reserva,
  ReservaDetalle,
  ReservasResumen,
  ResultadoVenta,
  SlotDisponible,
  VentaDetalle,
  VentaItemDetalle,
  VentaResumen,
} from './types';

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------
export async function listarInventario(busqueda = ''): Promise<ProductoInventario[]> {
  let query = supabase
    .from('v_inventario')
    .select('*')
    .order('nombre', { ascending: true })
    .limit(500);

  const termino = busqueda.trim();
  if (termino) {
    query = query.or(`nombre.ilike.%${termino}%,codigo_barras.eq.${termino}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductoInventario[];
}

export interface ProductoInput {
  codigo_barras?: string | null;
  nombre: string;
  descripcion?: string | null;
  stock_minimo: number;
  precio_venta_neto: number;
}

export async function crearProducto(input: ProductoInput): Promise<void> {
  const { error } = await supabase.from('productos').insert({
    codigo_barras: input.codigo_barras || null,
    nombre: input.nombre,
    descripcion: input.descripcion || null,
    stock_minimo: input.stock_minimo,
    precio_venta_neto: input.precio_venta_neto,
  });
  if (error) throw new Error(error.message);
}

export async function actualizarProducto(id: string, input: ProductoInput): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .update({
      codigo_barras: input.codigo_barras || null,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
      stock_minimo: input.stock_minimo,
      precio_venta_neto: input.precio_venta_neto,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Ventas y devoluciones
// ---------------------------------------------------------------------------
export async function registrarVenta(
  items: ItemVenta[],
  medioPago: MedioPago,
): Promise<ResultadoVenta> {
  const { data, error } = await supabase.rpc('registrar_venta', {
    p_items: items,
    p_medio_pago: medioPago,
  });
  if (error) throw new Error(error.message);
  return data as ResultadoVenta;
}

export async function registrarDevolucion(
  items: ItemVenta[],
  medioPago: MedioPago,
  motivo: string,
  ventaOrigenId?: string | null,
): Promise<ResultadoVenta> {
  const { data, error } = await supabase.rpc('registrar_devolucion', {
    p_items: items,
    p_medio_pago: medioPago,
    p_motivo: motivo,
    p_venta_origen_id: ventaOrigenId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as ResultadoVenta;
}

export async function anularVenta(ventaId: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('anular_venta', {
    p_venta_id: ventaId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

export async function listarVentas(desde: string, hasta: string): Promise<VentaResumen[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, numero, tipo, medio_pago, total_neto, total_iva, total, estado, created_at, vendedor_id')
    .gte('created_at', desde)
    .lt('created_at', hasta)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as VentaResumen[];
}

// ---------------------------------------------------------------------------
// Clientes y mascotas
// ---------------------------------------------------------------------------
export async function listarClientes(busqueda = ''): Promise<Cliente[]> {
  let query = supabase
    .from('clientes')
    .select('id, nombres, apellidos, rut, telefono, email, created_at')
    .order('apellidos', { ascending: true })
    .limit(50);

  const termino = busqueda.trim();
  if (termino) {
    query = query.or(
      `nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,rut.eq.${termino},telefono.eq.${termino}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Cliente[];
}

export interface ClienteInput {
  nombres: string;
  apellidos: string;
  rut: string;
  telefono: string;
  email?: string | null;
}

export async function crearCliente(input: ClienteInput): Promise<string> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombres: input.nombres,
      apellidos: input.apellidos,
      rut: input.rut,
      telefono: input.telefono,
      email: input.email || null,
      origen: 'interno',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function eliminarCliente(id: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_cliente', { p_cliente_id: id });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------
export async function listarProfesionales(): Promise<Profesional[]> {
  const { data, error } = await supabase
    .from('profesionales')
    .select('id, nombre, area, especialidad, duracion_slot_min, color, orden, activo, email, perfil_id')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profesional[];
}

export async function listarProfesionalesTodos(): Promise<Profesional[]> {
  const { data, error } = await supabase
    .from('profesionales')
    .select('id, nombre, area, especialidad, duracion_slot_min, color, orden, activo, email, perfil_id')
    .order('orden', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profesional[];
}

export interface ProfesionalInput {
  nombre: string;
  area: string;
  especialidad?: string | null;
  duracion_slot_min: number;
  color?: string | null;
  orden: number;
  activo: boolean;
  email?: string | null;
}

export async function crearProfesional(input: ProfesionalInput): Promise<string> {
  const { data, error } = await supabase
    .from('profesionales')
    .insert({
      nombre: input.nombre,
      area: input.area,
      especialidad: input.especialidad || null,
      duracion_slot_min: input.duracion_slot_min,
      color: input.color || null,
      orden: input.orden,
      activo: input.activo,
      email: input.email || null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function actualizarProfesional(id: string, input: ProfesionalInput): Promise<void> {
  const { error } = await supabase
    .from('profesionales')
    .update({
      nombre: input.nombre,
      area: input.area,
      especialidad: input.especialidad || null,
      duracion_slot_min: input.duracion_slot_min,
      color: input.color || null,
      orden: input.orden,
      activo: input.activo,
      email: input.email || null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function vincularPerfilProfesional(
  profesionalId: string,
  perfilId: string,
): Promise<void> {
  const { error } = await supabase
    .from('profesionales')
    .update({ perfil_id: perfilId })
    .eq('id', profesionalId);
  if (error) throw new Error(error.message);
}

export async function eliminarProfesional(id: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_profesional', { p_profesional_id: id });
  if (error) throw new Error(error.message);
}

export interface InvitarUsuarioInput {
  email: string;
  nombre_completo: string;
  rol: 'maestro' | 'vendedor' | 'cliente';
  redirectTo?: string;
}

export interface InvitarUsuarioResultado {
  id: string;
  correo_enviado: boolean;
  enlace: string | null;
}

export async function invitarUsuario(
  input: InvitarUsuarioInput,
): Promise<InvitarUsuarioResultado> {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', {
    body: { accion: 'invitar_usuario', ...input },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as InvitarUsuarioResultado;
}

export async function listarReservas(desde: string, hasta: string): Promise<Reserva[]> {
  const { data, error } = await supabase
    .from('reservas')
    .select('id, profesional_id, cliente_id, mascota_id, inicio, fin, estado, motivo, origen, fuera_de_horario')
    .gte('inicio', desde)
    .lt('inicio', hasta)
    .order('inicio', { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as Reserva[];
}

export interface ReservaInternaInput {
  profesional_id: string;
  cliente_id: string;
  mascota_id?: string | null;
  inicio: string;
  fin?: string | null;
  motivo?: string | null;
  forzar_fuera_horario?: boolean;
}

export async function crearReservaInterna(input: ReservaInternaInput): Promise<string> {
  const { data, error } = await supabase.rpc('crear_reserva_interna', {
    p_profesional_id: input.profesional_id,
    p_cliente_id: input.cliente_id,
    p_mascota_id: input.mascota_id ?? null,
    p_inicio: input.inicio,
    p_fin: input.fin ?? null,
    p_motivo: input.motivo ?? null,
    p_forzar_fuera_horario: input.forzar_fuera_horario ?? false,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cambiarEstadoReserva(
  reservaId: string,
  estado: Reserva['estado'],
  motivo?: string,
): Promise<void> {
  const { error } = await supabase.rpc('cambiar_estado_reserva', {
    p_reserva_id: reservaId,
    p_estado: estado,
    p_motivo: motivo ?? null,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------
export async function reporteVentas(
  desde: string,
  hasta: string,
  agrupar: 'dia' | 'semana' | 'mes',
): Promise<ReporteFila[]> {
  const { data, error } = await supabase.rpc('reporte_ventas_productos', {
    p_desde: desde,
    p_hasta: hasta,
    p_agrupar: agrupar,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReporteFila[];
}

// ---------------------------------------------------------------------------
// Publico
// ---------------------------------------------------------------------------
export async function profesionalesPublicos(): Promise<ProfesionalPublico[]> {
  const { data, error } = await supabase.rpc('profesionales_publicos');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfesionalPublico[];
}

export async function configPublica(): Promise<ConfigPublica | null> {
  const { data, error } = await supabase.rpc('config_publica');
  if (error) throw new Error(error.message);
  const filas = (data ?? []) as ConfigPublica[];
  return filas[0] ?? null;
}

export async function horariosDisponibles(
  profesionalId: string,
  desde: string,
  hasta: string,
  ignorarAnticipacion = false,
): Promise<SlotDisponible[]> {
  const { data, error } = await supabase.rpc('horarios_disponibles', {
    p_profesional_id: profesionalId,
    p_desde: desde,
    p_hasta: hasta,
    p_ignorar_anticipacion: ignorarAnticipacion,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SlotDisponible[];
}

export interface ReservaPublicaPayload {
  profesional_id: string;
  inicio: string;
  motivo: string;
  turnstile_token: string;
  cliente: {
    nombres: string;
    apellidos: string;
    rut: string;
    telefono: string;
    email?: string;
  };
  mascota: {
    nombre: string;
    especie: string;
    raza?: string;
    peso_kg?: number | null;
  };
}

export async function crearReservaPublica(
  payload: ReservaPublicaPayload,
): Promise<{ reserva_id: string; token_gestion: string }> {
  const { data, error } = await supabase.functions.invoke('reserva-publica', {
    body: payload,
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { reserva_id: string; token_gestion: string };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function dashboardResumen(desde: string, hasta: string): Promise<DashboardResumen> {
  const { data, error } = await supabase.rpc('dashboard_resumen', {
    p_desde: desde,
    p_hasta: hasta,
  });
  if (error) throw new Error(error.message);
  return data as DashboardResumen;
}

export async function reservasResumen(): Promise<ReservasResumen> {
  const { data, error } = await supabase.rpc('reservas_resumen');
  if (error) throw new Error(error.message);
  return data as ReservasResumen;
}

// ---------------------------------------------------------------------------
// Detalle de venta y devoluciones
// ---------------------------------------------------------------------------
export async function obtenerVentaDetalle(ventaId: string): Promise<VentaDetalle> {
  const [{ data: venta, error: errorVenta }, { data: items, error: errorItems }] =
    await Promise.all([
      supabase
        .from('ventas')
        .select('id, numero, tipo, medio_pago, total_neto, total_iva, total, estado, created_at, vendedor_id')
        .eq('id', ventaId)
        .maybeSingle(),
      supabase
        .from('venta_items')
        .select('id, producto_id, nombre_producto, codigo_barras, precio_unitario_neto, iva_unitario, cantidad, total_linea, reingresa_stock')
        .eq('venta_id', ventaId)
        .order('nombre_producto', { ascending: true }),
    ]);

  if (errorVenta) throw new Error(errorVenta.message);
  if (errorItems) throw new Error(errorItems.message);
  if (!venta) throw new Error('Venta no encontrada');

  return {
    venta: venta as VentaResumen,
    items: (items ?? []) as VentaItemDetalle[],
  };
}

// ---------------------------------------------------------------------------
// Clientes con mascotas
// ---------------------------------------------------------------------------
export async function listarClientesConMascotas(busqueda = ''): Promise<ClienteConMascotas[]> {
  let query = supabase
    .from('clientes')
    .select('id, nombres, apellidos, rut, telefono, email, created_at, mascotas(id, nombre, especie, raza, peso_kg)')
    .order('apellidos', { ascending: true })
    .limit(50);

  const termino = busqueda.trim();
  if (termino) {
    query = query.or(
      `nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,rut.eq.${termino},telefono.eq.${termino}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClienteConMascotas[];
}

export interface MascotaInput {
  cliente_id: string;
  nombre: string;
  especie: string;
  raza?: string | null;
  peso_kg?: number | null;
}

export async function crearMascota(input: MascotaInput): Promise<void> {
  const { error } = await supabase.from('mascotas').insert({
    cliente_id: input.cliente_id,
    nombre: input.nombre,
    especie: input.especie,
    raza: input.raza || null,
    peso_kg: input.peso_kg ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listarMascotasCliente(clienteId: string): Promise<MascotaResumen[]> {
  const { data, error } = await supabase
    .from('mascotas')
    .select('id, nombre, especie, raza, peso_kg')
    .eq('cliente_id', clienteId)
    .eq('activa', true)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MascotaResumen[];
}

// ---------------------------------------------------------------------------
// Agenda extendida
// ---------------------------------------------------------------------------
export async function listarHorariosSemanales(): Promise<HorarioSemanal[]> {
  const { data, error } = await supabase
    .from('horarios_semanales')
    .select('id, profesional_id, dia_semana, hora_inicio, hora_fin')
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as HorarioSemanal[];
}

export async function listarExcepciones(desde: string, hasta: string): Promise<ExcepcionAgenda[]> {
  const { data, error } = await supabase
    .from('excepciones_agenda')
    .select('id, profesional_id, area, fecha_desde, fecha_hasta, hora_inicio, hora_fin, modo, motivo')
    .lte('fecha_desde', hasta)
    .gte('fecha_hasta', desde);

  if (error) throw new Error(error.message);
  return (data ?? []) as ExcepcionAgenda[];
}

export async function listarReservasDia(desde: string, hasta: string): Promise<ReservaDetalle[]> {
  const { data, error } = await supabase
    .from('reservas')
    .select(
      'id, profesional_id, cliente_id, mascota_id, inicio, fin, estado, motivo, origen, fuera_de_horario, clientes(nombres, apellidos, rut, telefono), mascotas(nombre, especie, raza, peso_kg)',
    )
    .gte('inicio', desde)
    .lt('inicio', hasta)
    .order('inicio', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReservaDetalle[];
}

// ---------------------------------------------------------------------------
// Ranking de productos
// ---------------------------------------------------------------------------
export async function rankingProductos(
  desde: string,
  hasta: string,
): Promise<RankingProducto[]> {
  const { data, error } = await supabase.rpc('ranking_productos', {
    p_desde: desde,
    p_hasta: hasta,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as RankingProducto[];
}

// ---------------------------------------------------------------------------
// Ocupacion de agenda (sin datos personales, para el rol cliente)
// ---------------------------------------------------------------------------
export async function agendaOcupacion(
  desde: string,
  hasta: string,
): Promise<AgendaOcupacion[]> {
  const { data, error } = await supabase.rpc('agenda_ocupacion', {
    p_desde: desde,
    p_hasta: hasta,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AgendaOcupacion[];
}

// ---------------------------------------------------------------------------
// Reservas de productos (apartado con 1 dia para retirar)
// ---------------------------------------------------------------------------
export async function listarReservasProducto(): Promise<ReservaProducto[]> {
  const { data, error } = await supabase
    .from('v_reservas_producto')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as ReservaProducto[];
}

export async function crearReservaProducto(
  productoId: string,
  cantidad: number,
  notas?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('crear_reserva_producto', {
    p_producto_id: productoId,
    p_cantidad: cantidad,
    p_notas: notas ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelarReservaProducto(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_reserva_producto', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function marcarReservaRetirada(id: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_reserva_retirada', { p_id: id });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Reservas de hora del cliente
// ---------------------------------------------------------------------------
export async function listarMisReservas(): Promise<MiReserva[]> {
  const { data, error } = await supabase
    .from('reservas')
    .select('id, inicio, fin, estado, motivo, origen, profesionales(nombre), mascotas(nombre)')
    .order('inicio', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MiReserva[];
}

export async function cancelarMiReserva(id: string, motivo?: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_mi_reserva', {
    p_reserva_id: id,
    p_motivo: motivo ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function crearReservaCliente(
  profesionalId: string,
  mascotaId: string | null,
  inicio: string,
  motivo?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('crear_reserva_cliente', {
    p_profesional_id: profesionalId,
    p_mascota_id: mascotaId,
    p_inicio: inicio,
    p_motivo: motivo ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function misDatos(): Promise<MisDatos> {
  const { data: cliente, error: errorCliente } = await supabase
    .from('clientes')
    .select('id, nombres, apellidos, rut, telefono, email, created_at')
    .limit(1)
    .maybeSingle();

  if (errorCliente) throw new Error(errorCliente.message);
  if (!cliente) return { cliente: null, mascotas: [] };

  const { data: mascotas, error: errorMascotas } = await supabase
    .from('mascotas')
    .select('id, nombre, especie, raza, peso_kg')
    .eq('cliente_id', cliente.id)
    .eq('activa', true)
    .order('nombre', { ascending: true });

  if (errorMascotas) throw new Error(errorMascotas.message);

  return {
    cliente: cliente as Cliente,
    mascotas: (mascotas ?? []) as MascotaResumen[],
  };
}

export interface MisDatosInput {
  nombres: string;
  apellidos: string;
  rut: string;
  telefono: string;
}

export async function actualizarMisDatos(input: MisDatosInput): Promise<void> {
  const { error } = await supabase.rpc('actualizar_mis_datos', {
    p_nombres: input.nombres,
    p_apellidos: input.apellidos,
    p_rut: input.rut,
    p_telefono: input.telefono,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Horario semanal de los profesionales
// ---------------------------------------------------------------------------
export interface HorarioInput {
  profesional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export async function crearHorario(input: HorarioInput): Promise<void> {
  const { error } = await supabase.from('horarios_semanales').insert({
    profesional_id: input.profesional_id,
    dia_semana: input.dia_semana,
    hora_inicio: input.hora_inicio,
    hora_fin: input.hora_fin,
  });
  if (error) throw new Error(error.message);
}

export async function eliminarHorario(id: string): Promise<void> {
  const { error } = await supabase.from('horarios_semanales').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
