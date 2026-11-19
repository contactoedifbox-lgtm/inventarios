export type Rol = 'maestro' | 'vendedor';
export type MedioPago = 'efectivo' | 'debito' | 'credito' | 'transferencia';
export type AreaAgenda = 'veterinaria' | 'peluqueria';
export type Especie = 'perro' | 'gato' | 'otro';
export type EstadoReserva = 'confirmada' | 'completada' | 'cancelada' | 'no_asistio';

export interface ProductoInventario {
  id: string;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  stock: number;
  stock_minimo: number;
  precio_venta_neto: number;
  iva_precio_venta: number;
  precio_venta_total: number;
  activo: boolean;
  stock_bajo: boolean;
  costo_neto: number | null;
  iva_costo: number | null;
  costo_total: number | null;
  margen_neto: number | null;
}

export interface VentaResumen {
  id: string;
  numero: number;
  tipo: 'venta' | 'devolucion';
  medio_pago: MedioPago;
  total_neto: number;
  total_iva: number;
  descuento: number;
  descripcion_descuento: string | null;
  total: number;
  estado: 'completada' | 'anulada';
  created_at: string;
  vendedor_id: string;
}

export interface Cliente {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  telefono: string;
  email: string | null;
  created_at: string;
}

export interface Mascota {
  id: string;
  cliente_id: string;
  nombre: string;
  especie: Especie;
  raza: string | null;
  peso_kg: number | null;
}

export interface Profesional {
  id: string;
  nombre: string;
  area: AreaAgenda;
  especialidad: string | null;
  duracion_slot_min: number;
  color: string | null;
  orden: number;
  activo: boolean;
  email: string | null;
  perfil_id: string | null;
}

export interface Reserva {
  id: string;
  profesional_id: string;
  cliente_id: string;
  mascota_id: string | null;
  inicio: string;
  fin: string;
  estado: EstadoReserva;
  motivo: string | null;
  origen: 'interno' | 'web';
  fuera_de_horario: boolean;
}

export interface ReporteFila {
  producto_id: string;
  nombre_producto: string;
  periodo: string;
  unidades: number;
  total_neto: number;
  total_iva: number;
  total: number;
}

export interface SlotDisponible {
  inicio: string;
  fin: string;
}

export interface ProfesionalPublico {
  id: string;
  nombre: string;
  area: AreaAgenda;
}

export interface ConfigPublica {
  nombre_negocio: string;
  reserva_anticipacion_min_horas: number;
  reserva_max_dias: number;
  reserva_max_activas_por_contacto: number;
}

export interface ItemVenta {
  producto_id: string;
  cantidad: number;
  reingresa_stock?: boolean;
}

export interface ResultadoVenta {
  venta_id: string;
  numero: number;
  total_neto: number;
  total_iva: number;
  total: number;
}

export interface DashboardResumen {
  ventas: { total: number; neto: number; iva: number; unidades: number };
  documentos: { ventas: number; devoluciones: number };
  reservas: { total: number; confirmadas: number; completadas: number };
  inventario: { productos: number; stock_total: number; stock_bajo: number; agotados: number };
}

export interface ReservasResumen {
  dia: number;
  semana: number;
  mes: number;
}

export interface VentaItemDetalle {
  id: string;
  producto_id: string;
  nombre_producto: string;
  codigo_barras: string | null;
  precio_unitario_neto: number;
  iva_unitario: number;
  cantidad: number;
  total_linea: number;
  reingresa_stock: boolean;
}

export interface VentaDetalle {
  venta: VentaResumen;
  items: VentaItemDetalle[];
}

export interface MascotaResumen {
  id: string;
  nombre: string;
  especie: Especie;
  raza: string | null;
  peso_kg: number | null;
}

export interface ClienteConMascotas extends Cliente {
  mascotas: MascotaResumen[];
}

export interface ReservaDetalle extends Reserva {
  clientes: { nombres: string; apellidos: string; rut: string; telefono: string } | null;
  mascotas: {
    nombre: string;
    especie: Especie;
    raza: string | null;
    peso_kg: number | null;
  } | null;
}

export interface HorarioSemanal {
  id: string;
  profesional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface MisDatos {
  cliente: Cliente | null;
  mascotas: MascotaResumen[];
}

export interface MiReserva {
  id: string;
  inicio: string;
  fin: string;
  estado: EstadoReserva;
  motivo: string | null;
  origen: 'interno' | 'web';
  profesionales: { nombre: string } | null;
  mascotas: { nombre: string } | null;
}

export interface ReservaProducto {
  id: string;
  producto_id: string;
  producto_nombre: string;
  codigo_barras: string | null;
  perfil_id: string;
  perfil_nombre: string | null;
  cantidad: number;
  estado: 'pendiente' | 'retirada' | 'cancelada' | 'vencida';
  expira_at: string;
  notas: string | null;
  created_at: string;
}

export interface RankingProducto {
  producto_id: string;
  nombre: string;
  unidades: number;
  total: number;
  ultima_venta: string | null;
  dias_detenido: number;
}

export interface AgendaOcupacion {
  profesional_id: string;
  inicio: string;
  fin: string;
}

export interface ExcepcionAgenda {
  id: string;
  profesional_id: string | null;
  area: AreaAgenda | null;
  fecha_desde: string;
  fecha_hasta: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  modo: 'cerrar' | 'abrir';
  motivo: string | null;
}
