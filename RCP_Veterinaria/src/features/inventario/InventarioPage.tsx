import { useEffect, useState, type FormEvent } from 'react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/features/auth/AuthProvider';
import { listarInventario } from '@/lib/api';
import {
  useActualizarProducto,
  useCancelarReservaProducto,
  useCrearProducto,
  useCrearReservaProducto,
  useInventario,
  useMarcarReservaRetirada,
  useReservasProducto,
} from '@/lib/hooks';
import { formatCLP, formatFechaHora } from '@/lib/format';
import { productoSchema } from '@/lib/schemas';
import type { ProductoInventario, ReservaProducto } from '@/lib/types';

const FORM_VACIO = {
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  stock_minimo: 0,
  precio_venta_neto: 0,
};

function estadoEfectivo(reserva: ReservaProducto): ReservaProducto['estado'] {
  if (reserva.estado === 'pendiente' && new Date(reserva.expira_at) < new Date()) {
    return 'vencida';
  }
  return reserva.estado;
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

  // Reserva de producto
  const [productoReservar, setProductoReservar] = useState<ProductoInventario | null>(null);
  const [cantidadReserva, setCantidadReserva] = useState(1);
  const [notasReserva, setNotasReserva] = useState('');
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(busqueda), 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const { data: productos = [], isLoading } = useInventario(debounced);
  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const { data: reservas = [] } = useReservasProducto();
  const crearReserva = useCrearReservaProducto();
  const cancelarReserva = useCancelarReservaProducto();
  const marcarRetirada = useMarcarReservaRetirada();

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
        columnas.push({ header: 'Costo neto', key: 'costo_neto', width: 14 });
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
      precio_venta_neto: producto.precio_venta_neto,
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

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input: parsed.data });
      } else {
        await crear.mutateAsync(parsed.data);
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

  // El personal ve todas las reservas; el cliente solo las suyas (lo limita el RLS),
  // incluyendo el historial, y puede cancelar las que estan pendientes.
  const reservasVisibles = reservas;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
        {!esCliente && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void exportar()}
              disabled={exportando}
            >
              {exportando ? 'Exportando...' : 'Exportar a Excel'}
            </button>
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
                <th className="py-2">Producto</th>
                <th className="py-2">Descripcion</th>
                <th className="py-2 text-right">Stock</th>
                <th className="py-2 text-right">Precio</th>
                {esMaestro && <th className="py-2 text-right">Costo</th>}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
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
                    {producto.stock}
                    {producto.stock <= 3 && (
                      <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 text-xs text-warning-700">
                        {producto.stock === 0 ? 'agotado' : 'bajo'}
                      </span>
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
                      <button
                        type="button"
                        className="text-brand-600 hover:underline disabled:text-slate-300"
                        disabled={producto.stock <= 0}
                        onClick={() => abrirReserva(producto)}
                      >
                        Reservar
                      </button>
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
              <label className="label">Precio neto</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.precio_venta_neto}
                onChange={(e) => setForm({ ...form, precio_venta_neto: Number(e.target.value) })}
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

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <p className="text-xs text-slate-400">
            El IVA y el precio total se calculan en el servidor. El stock no se edita aqui.
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
              {formatCLP(productoReservar.precio_venta_total)} · stock {productoReservar.stock}
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
    </div>
  );
}
