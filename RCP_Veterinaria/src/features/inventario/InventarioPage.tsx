import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/features/auth/AuthProvider';
import { listarInventario } from '@/lib/api';
import {
  useActualizarProducto,
  useAjustarStock,
  useCambiarEstadoEncargo,
  useCancelarReservaProducto,
  useCrearEncargo,
  useCrearProducto,
  useCrearReservaProducto,
  useEncargos,
  useGuardarCosto,
  useInventario,
  useIva,
  useMarcarReservaRetirada,
  useProgramarEntregaEncargo,
  useRegistrarIngreso,
  useReservasProducto,
} from '@/lib/hooks';
import { formatCLP, formatFecha, formatFechaHora } from '@/lib/format';
import { productoSchema } from '@/lib/schemas';
import type { ProductoInventario, ReservaProducto } from '@/lib/types';

const FORM_VACIO = {
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  stock_minimo: 0,
  precio_venta_total: 0,
  stock_inicial: 0,
  stock: 0,
  costo_total: 0,
};

function estadoEfectivo(reserva: ReservaProducto): ReservaProducto['estado'] {
  if (reserva.estado === 'pendiente' && new Date(reserva.expira_at) < new Date()) {
    return 'vencida';
  }
  return reserva.estado;
}

type OrdenCampo = 'nombre' | 'stock' | 'precio';

/** Encabezado de columna ordenable con flechas arriba/abajo. */
function ThOrden({
  label,
  campo,
  actual,
  dir,
  onOrdenar,
  align = 'left',
}: {
  label: string;
  campo: OrdenCampo;
  actual: OrdenCampo;
  dir: 'asc' | 'desc';
  onOrdenar: (campo: OrdenCampo) => void;
  align?: 'left' | 'right';
}) {
  const activo = actual === campo;
  return (
    <th className={`py-2 ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 transition-colors hover:text-brand-700 ${
          activo ? 'text-brand-700' : ''
        }`}
        onClick={() => onOrdenar(campo)}
      >
        {label}
        <span className="inline-flex flex-col text-[8px] leading-[8px]">
          <span className={activo && dir === 'asc' ? 'text-brand-700' : 'text-slate-300'}>▲</span>
          <span className={activo && dir === 'desc' ? 'text-brand-700' : 'text-slate-300'}>▼</span>
        </span>
      </button>
    </th>
  );
}

export function InventarioPage() {
  const { esMaestro, esCliente } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [debounced, setDebounced] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<ProductoInventario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('nombre');
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('asc');

  // Reserva de producto
  const [productoReservar, setProductoReservar] = useState<ProductoInventario | null>(null);
  const [cantidadReserva, setCantidadReserva] = useState(1);
  const [notasReserva, setNotasReserva] = useState('');
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);

  // Encargo de producto (cliente, cuando no hay stock)
  const [productoEncargar, setProductoEncargar] = useState<ProductoInventario | null>(null);
  const [cantidadEncargo, setCantidadEncargo] = useState(1);
  const [notasEncargo, setNotasEncargo] = useState('');
  const [errorEncargo, setErrorEncargo] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(busqueda), 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const { data: productos = [], isLoading } = useInventario(debounced);
  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const ajustarStock = useAjustarStock();
  const guardarCosto = useGuardarCosto();
  const registrarIngreso = useRegistrarIngreso();
  const { data: iva = 19 } = useIva();
  const { data: reservas = [] } = useReservasProducto();
  const crearReserva = useCrearReservaProducto();
  const cancelarReserva = useCancelarReservaProducto();
  const marcarRetirada = useMarcarReservaRetirada();
  const { data: encargos = [] } = useEncargos();
  const crearEncargo = useCrearEncargo();
  const cambiarEstadoEncargo = useCambiarEstadoEncargo();
  const programarEntrega = useProgramarEntregaEncargo();

  const productosOrdenados = useMemo(() => {
    const copia = [...productos];
    copia.sort((a, b) => {
      let cmp = 0;
      if (ordenCampo === 'nombre') cmp = a.nombre.localeCompare(b.nombre, 'es');
      else if (ordenCampo === 'stock') cmp = a.stock - b.stock;
      else cmp = a.precio_venta_total - b.precio_venta_total;
      return ordenDir === 'asc' ? cmp : -cmp;
    });
    return copia;
  }, [productos, ordenCampo, ordenDir]);

  function ordenarPor(campo: OrdenCampo) {
    if (ordenCampo === campo) {
      setOrdenDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenCampo(campo);
      setOrdenDir('asc');
    }
  }

  async function exportar() {
    setExportando(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const datos = await listarInventario('');

      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('Inventario');

      const columnas: { header: string; key: string; width: number }[] = [
        { header: 'Nombre', key: 'nombre', width: 32 },
        { header: 'Codigo', key: 'codigo_barras', width: 16 },
        { header: 'Descripcion', key: 'descripcion', width: 40 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Stock minimo', key: 'stock_minimo', width: 12 },
        { header: 'Precio neto', key: 'precio_venta_neto', width: 14 },
        { header: 'IVA', key: 'iva_precio_venta', width: 10 },
        { header: 'Precio total', key: 'precio_venta_total', width: 14 },
        { header: 'Activo', key: 'activo', width: 8 },
      ];
      if (esMaestro) {
        columnas.push(
          { header: 'Costo neto', key: 'costo_neto', width: 14 },
          { header: 'IVA costo', key: 'iva_costo', width: 12 },
          { header: 'Costo total', key: 'costo_total', width: 14 },
        );
      }
      hoja.columns = columnas;

      datos.forEach((producto) =>
        hoja.addRow({ ...producto, activo: producto.activo ? 'si' : 'no' }),
      );

      const buffer = await libro.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`;
      enlace.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(producto: ProductoInventario) {
    setEditando(producto);
    setForm({
      codigo_barras: producto.codigo_barras ?? '',
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      stock_minimo: producto.stock_minimo,
      precio_venta_total: producto.precio_venta_total,
      stock_inicial: 0,
      stock: producto.stock,
      costo_total: producto.costo_total ?? 0,
    });
    setError(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEditando(null);
    setError(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    const parsed = productoSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    const costoNeto = Math.round(form.costo_total / (1 + iva / 100));

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input: parsed.data });
        if (form.stock !== editando.stock) {
          await ajustarStock.mutateAsync({
            productoId: editando.id,
            nuevoStock: form.stock,
            motivo: 'Ajuste manual desde edicion de producto',
          });
        }
        if (esMaestro && form.costo_total > 0) {
          await guardarCosto.mutateAsync({ productoId: editando.id, costoNeto });
        }
      } else {
        const productoId = await crear.mutateAsync(parsed.data);
        if (parsed.data.stock_inicial > 0) {
          await registrarIngreso.mutateAsync([
            { producto_id: productoId, cantidad: parsed.data.stock_inicial },
          ]);
        }
        if (esMaestro && form.costo_total > 0) {
          await guardarCosto.mutateAsync({ productoId, costoNeto });
        }
      }
      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  function abrirReserva(producto: ProductoInventario) {
    setProductoReservar(producto);
    setCantidadReserva(1);
    setNotasReserva('');
    setErrorReserva(null);
    setMensajeReserva(null);
  }

  async function confirmarReserva() {
    if (!productoReservar) return;
    setErrorReserva(null);

    try {
      await crearReserva.mutateAsync({
        productoId: productoReservar.id,
        cantidad: cantidadReserva,
        notas: notasReserva || undefined,
      });
      setMensajeReserva(
        `Reserva creada para ${productoReservar.nombre}. Tienes 1 dia para retirarlo.`,
      );
      setProductoReservar(null);
    } catch (err) {
      setErrorReserva(err instanceof Error ? err.message : 'No se pudo reservar');
    }
  }

  function abrirEncargo(producto: ProductoInventario) {
    setProductoEncargar(producto);
    setCantidadEncargo(1);
    setNotasEncargo('');
    setErrorEncargo(null);
  }

  async function confirmarEncargo() {
    if (!productoEncargar) return;
    setErrorEncargo(null);

    try {
      await crearEncargo.mutateAsync({
        productoId: productoEncargar.id,
        cantidad: cantidadEncargo,
        notas: notasEncargo || undefined,
      });
      setMensajeReserva(
        `Encargo registrado para ${productoEncargar.nombre}. La clinica te avisara cuando este disponible.`,
      );
      setProductoEncargar(null);
    } catch (err) {
      setErrorEncargo(err instanceof Error ? err.message : 'No se pudo registrar el encargo');
    }
  }

  // El personal ve todas las reservas; el cliente solo las suyas (lo limita el RLS),
  // incluyendo el historial, y puede cancelar las que estan pendientes.
  const reservasVisibles = reservas;

  const netoCalculado = Math.round(form.precio_venta_total / (1 + iva / 100));
  const ivaCalculado = form.precio_venta_total - netoCalculado;
  const costoNetoCalculado = Math.round(form.costo_total / (1 + iva / 100));
  const costoIvaCalculado = form.costo_total - costoNetoCalculado;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
        {!esCliente && (
          <div className="flex gap-2">
            {esMaestro && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void exportar()}
                disabled={exportando}
              >
                {exportando ? 'Exportando...' : 'Exportar a Excel'}
              </button>
            )}
            <button type="button" className="btn-primary" onClick={abrirNuevo}>
              Nuevo producto
            </button>
          </div>
        )}
      </div>

      {mensajeReserva && (
        <p className="rounded-lg bg-success-50 p-3 text-sm text-success-700">{mensajeReserva}</p>
      )}

      <div className="card space-y-3">
        <BarcodeScanner onScan={(codigo) => setBusqueda(codigo)} />
        <input
          className="input"
          placeholder="Buscar por nombre o codigo de barras"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          {esCliente
            ? 'Puedes reservar productos: tienes 1 dia para retirarlos en la clinica.'
            : 'El stock solo cambia por RPC (ventas, devoluciones, ingresos y ajustes).'}
        </p>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando inventario...</p>
        ) : productos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin productos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <ThOrden
                  label="Producto"
                  campo="nombre"
                  actual={ordenCampo}
                  dir={ordenDir}
                  onOrdenar={ordenarPor}
                />
                <th className="py-2">Descripcion</th>
                <ThOrden
                  label="Stock"
                  campo="stock"
                  actual={ordenCampo}
                  dir={ordenDir}
                  onOrdenar={ordenarPor}
                  align="right"
                />
                <ThOrden
                  label="Precio"
                  campo="precio"
                  actual={ordenCampo}
                  dir={ordenDir}
                  onOrdenar={ordenarPor}
                  align="right"
                />
                {esMaestro && <th className="py-2 text-right">Costo</th>}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {productosOrdenados.map((producto) => (
                <tr key={producto.id} className="border-b border-slate-100">
                  <td className="py-2">
                    <span className="font-medium text-slate-700">{producto.nombre}</span>
                    {producto.codigo_barras && (
                      <span className="ml-2 text-xs text-slate-400">{producto.codigo_barras}</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate py-2 text-slate-500">
                    {producto.descripcion ?? '-'}
                  </td>
                  <td className="py-2 text-right">
                    {esCliente ? (
                      producto.stock > 0 ? (
                        <span className="badge-success">Disponible</span>
                      ) : (
                        <span className="badge-danger">Sin stock</span>
                      )
                    ) : (
                      <>
                        {producto.stock}
                        {producto.stock <= 3 && (
                          <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 text-xs text-warning-700">
                            {producto.stock === 0 ? 'agotado' : 'bajo'}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-2 text-right">{formatCLP(producto.precio_venta_total)}</td>
                  {esMaestro && (
                    <td className="py-2 text-right text-slate-500">
                      {producto.costo_neto != null ? formatCLP(producto.costo_neto) : '-'}
                    </td>
                  )}
                  <td className="py-2 text-right">
                    {esCliente ? (
                      producto.stock > 0 ? (
                        <button
                          type="button"
                          className="text-brand-600 hover:underline"
                          onClick={() => abrirReserva(producto)}
                        >
                          Reservar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-brand-600 hover:underline"
                          onClick={() => abrirEncargo(producto)}
                        >
                          Encargar
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        className="text-brand-600 hover:underline"
                        onClick={() => abrirEditar(producto)}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reservasVisibles.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
            {esCliente ? 'Mis reservas' : 'Reservas de productos'}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Producto</th>
                {!esCliente && <th className="py-2">Solicitante</th>}
                <th className="py-2 text-right">Cantidad</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Retirar antes de</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {reservasVisibles.map((reserva) => {
                const estado = estadoEfectivo(reserva);
                return (
                  <tr key={reserva.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{reserva.producto_nombre}</td>
                    {!esCliente && (
                      <td className="py-2 text-slate-500">{reserva.perfil_nombre ?? '-'}</td>
                    )}
                    <td className="py-2 text-right">{reserva.cantidad}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          estado === 'pendiente'
                            ? 'bg-warning-50 text-warning-700'
                            : estado === 'retirada'
                              ? 'bg-success-50 text-success-700'
                              : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {estado}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500">{formatFechaHora(reserva.expira_at)}</td>
                    <td className="py-2 text-right">
                      {estado === 'pendiente' && (
                        <div className="flex justify-end gap-3">
                          {!esCliente && (
                            <button
                              type="button"
                              className="text-success-600 hover:underline"
                              onClick={() => marcarRetirada.mutate(reserva.id)}
                            >
                              Retirada
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-danger-600 hover:underline"
                            onClick={() => cancelarReserva.mutate(reserva.id)}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {encargos.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
            {esCliente ? 'Mis encargos' : 'Encargos de productos'}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Producto</th>
                {!esCliente && <th className="py-2">Solicitante</th>}
                <th className="py-2 text-right">Cantidad</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Fecha encargo</th>
                <th className="py-2">Fecha entrega</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {encargos.map((encargo) => (
                <tr key={encargo.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{encargo.producto_nombre}</td>
                  {!esCliente && (
                    <td className="py-2 text-slate-500">{encargo.perfil_nombre ?? '-'}</td>
                  )}
                  <td className="py-2 text-right">{encargo.cantidad}</td>
                  <td className="py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        encargo.estado === 'pendiente'
                          ? 'bg-warning-50 text-warning-700'
                          : encargo.estado === 'entregado'
                            ? 'bg-success-50 text-success-700'
                            : 'bg-slate-100 text-muted'
                      }`}
                    >
                      {encargo.estado}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{formatFechaHora(encargo.created_at)}</td>
                  <td className="py-2">
                    {esCliente ? (
                      encargo.fecha_entrega ? (
                        formatFecha(encargo.fecha_entrega)
                      ) : (
                        '-'
                      )
                    ) : (
                      <input
                        type="date"
                        className="input"
                        value={encargo.fecha_entrega ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            programarEntrega.mutate({ id: encargo.id, fecha: e.target.value });
                          }
                        }}
                      />
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {encargo.estado === 'pendiente' && (
                      <div className="flex justify-end gap-3">
                        {!esCliente && (
                          <button
                            type="button"
                            className="text-success-600 hover:underline"
                            onClick={() =>
                              cambiarEstadoEncargo.mutate({ id: encargo.id, estado: 'entregado' })
                            }
                          >
                            Entregado
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-danger-600 hover:underline"
                          onClick={() =>
                            cambiarEstadoEncargo.mutate({ id: encargo.id, estado: 'cancelado' })
                          }
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal producto (solo personal) */}
      <Modal
        open={modalAbierto}
        onClose={cerrarModal}
        title={editando ? 'Editar producto' : 'Nuevo producto'}
      >
        <form className="space-y-3" onSubmit={guardar}>
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Codigo de barras</label>
            <input
              className="input"
              value={form.codigo_barras}
              onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Descripcion</label>
            <textarea
              className="input"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio total (con IVA)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.precio_venta_total}
                onChange={(e) => setForm({ ...form, precio_venta_total: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Stock minimo</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="rounded-lg bg-canvas p-3 text-xs text-muted">
            Neto: <strong>{formatCLP(netoCalculado)}</strong> · IVA ({iva}%):{' '}
            <strong>{formatCLP(ivaCalculado)}</strong> · Total:{' '}
            <strong>{formatCLP(form.precio_venta_total)}</strong>
          </div>

          {editando ? (
            <div>
              <label className="label">Stock</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">
                El cambio de stock queda registrado como un ajuste en el kardex.
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Cantidad inicial (stock)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.stock_inicial}
                onChange={(e) => setForm({ ...form, stock_inicial: Number(e.target.value) })}
              />
            </div>
          )}

          {esMaestro && (
            <div>
              <label className="label">Costo total (con IVA)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.costo_total}
                onChange={(e) => setForm({ ...form, costo_total: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">
                Neto: <strong>{formatCLP(costoNetoCalculado)}</strong> · IVA ({iva}%):{' '}
                <strong>{formatCLP(costoIvaCalculado)}</strong>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <p className="text-xs text-slate-400">
            El neto y el IVA se calculan a partir del precio total. El stock se carga como ingreso.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={crear.isPending || actualizar.isPending}
            >
              {editando ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button type="button" className="btn-secondary" onClick={cerrarModal}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal reserva de producto */}
      <Modal
        open={Boolean(productoReservar)}
        onClose={() => setProductoReservar(null)}
        title="Reservar producto"
      >
        {productoReservar && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{productoReservar.nombre}</span> ·{' '}
              {formatCLP(productoReservar.precio_venta_total)}
            </p>

            <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
              Tienes <strong>1 dia</strong> para retirar el producto en la clinica. Si no lo
              retiras, la reserva se cancela automaticamente.
            </div>

            <div>
              <label className="label">Cantidad</label>
              <input
                type="number"
                min={1}
                max={productoReservar.stock}
                className="input"
                value={cantidadReserva}
                onChange={(e) => setCantidadReserva(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label">Notas (opcional)</label>
              <input
                className="input"
                value={notasReserva}
                onChange={(e) => setNotasReserva(e.target.value)}
              />
            </div>

            {errorReserva && <p className="text-sm text-danger-600">{errorReserva}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={crearReserva.isPending}
                onClick={() => void confirmarReserva()}
              >
                {crearReserva.isPending ? 'Reservando...' : 'Confirmar reserva'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setProductoReservar(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal encargar producto (cliente, sin stock) */}
      <Modal
        open={Boolean(productoEncargar)}
        onClose={() => setProductoEncargar(null)}
        title="Encargar producto"
      >
        {productoEncargar && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{productoEncargar.nombre}</span> ·{' '}
              {formatCLP(productoEncargar.precio_venta_total)}
            </p>

            <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
              Este producto no tiene stock. Registra un encargo y la clinica te avisara cuando este
              disponible.
            </div>

            <div>
              <label className="label">Cantidad</label>
              <input
                type="number"
                min={1}
                className="input"
                value={cantidadEncargo}
                onChange={(e) => setCantidadEncargo(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label">Notas (opcional)</label>
              <input
                className="input"
                value={notasEncargo}
                onChange={(e) => setNotasEncargo(e.target.value)}
              />
            </div>

            {errorEncargo && <p className="text-sm text-danger-600">{errorEncargo}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={crearEncargo.isPending}
                onClick={() => void confirmarEncargo()}
              >
                {crearEncargo.isPending ? 'Enviando...' : 'Confirmar encargo'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setProductoEncargar(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
