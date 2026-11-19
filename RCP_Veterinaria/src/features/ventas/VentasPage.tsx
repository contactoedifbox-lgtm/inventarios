import { useMemo, useState } from 'react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { Modal } from '@/components/ui/Modal';
import { RangoFiltro } from '@/components/ui/RangoFiltro';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useAnularVenta,
  useInventario,
  useIva,
  useRegistrarDevolucion,
  useRegistrarVenta,
  useVentaDetalle,
  useVentas,
} from '@/lib/hooks';
import { costosPorVenta } from '@/lib/api';
import { formatCLP, formatFechaHora } from '@/lib/format';
import { hoyISO, rangoDe, type RangoTipo } from '@/lib/dateRanges';
import type { ItemVenta, MedioPago, ProductoInventario } from '@/lib/types';

interface Linea {
  producto: ProductoInventario;
  cantidad: number;
}

const MEDIOS: MedioPago[] = ['efectivo', 'debito', 'credito', 'transferencia'];

const MOTIVOS = [
  { valor: 'buen_estado', label: 'Producto en buen estado (vuelve al inventario)', reingresa: true },
  { valor: 'caducado', label: 'Producto caducado (perdida)', reingresa: false },
  { valor: 'roto', label: 'Producto roto o danado (perdida)', reingresa: false },
  { valor: 'otro', label: 'Otro motivo', reingresa: true },
] as const;

export function VentasPage() {
  const { esMaestro } = useAuth();
  const { data: iva = 19 } = useIva();

  // Carrito
  const [busqueda, setBusqueda] = useState('');
  const { data: productos = [] } = useInventario(busqueda);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [descripcionDescuento, setDescripcionDescuento] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registrar = useRegistrarVenta();
  const anular = useAnularVenta();
  const devolver = useRegistrarDevolucion();

  // Historial con filtro
  const [tipo, setTipo] = useState<RangoTipo>('dia');
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const rango = useMemo(() => rangoDe(tipo, desde, hasta), [tipo, desde, hasta]);
  const { data: ventas = [] } = useVentas(rango.desde, rango.hasta);

  // Devolucion
  const [ventaDevolucion, setVentaDevolucion] = useState<string | null>(null);
  const { data: detalle } = useVentaDetalle(ventaDevolucion);
  const [motivoTipo, setMotivoTipo] = useState<(typeof MOTIVOS)[number]['valor']>('buen_estado');
  const [motivoTexto, setMotivoTexto] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('Ventas');

      const costos = await costosPorVenta(ventas.map((venta) => venta.id));

      hoja.columns = [
        { header: 'Numero', key: 'numero', width: 10 },
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Medio de pago', key: 'medio_pago', width: 16 },
        { header: 'Neto', key: 'total_neto', width: 12 },
        { header: 'IVA', key: 'total_iva', width: 12 },
        { header: 'Descuento', key: 'descuento', width: 12 },
        { header: 'Descripcion descuento', key: 'descripcion_descuento', width: 28 },
        { header: 'Total', key: 'total', width: 14 },
        { header: 'Costo neto', key: 'costo_neto', width: 14 },
        { header: 'IVA costo', key: 'iva_costo', width: 12 },
        { header: 'Costo total', key: 'costo_total', width: 14 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];

      ventas.forEach((venta) => {
        const costoNeto = costos[venta.id] ?? 0;
        const costoIva = Math.round((costoNeto * iva) / 100);
        hoja.addRow({
          numero: venta.numero,
          fecha: formatFechaHora(venta.created_at),
          tipo: venta.tipo,
          medio_pago: venta.medio_pago,
          total_neto: venta.total_neto,
          total_iva: venta.total_iva,
          descuento: venta.descuento,
          descripcion_descuento: venta.descripcion_descuento ?? '',
          total: venta.total,
          costo_neto: costoNeto,
          iva_costo: costoIva,
          costo_total: costoNeto + costoIva,
          estado: venta.estado,
        });
      });

      const buffer = await libro.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `ventas-${tipo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      enlace.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  function agregarProducto(producto: ProductoInventario) {
    setError(null);
    setLineas((previas) => {
      const existente = previas.find((l) => l.producto.id === producto.id);
      if (existente) {
        return previas.map((l) =>
          l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [...previas, { producto, cantidad: 1 }];
    });
  }

  function agregarPorCodigo(codigo: string) {
    const producto =
      productos.find((p) => p.codigo_barras === codigo) ??
      productos.find((p) => p.nombre.toLowerCase() === codigo.toLowerCase());

    if (!producto) {
      setError(`Producto no encontrado: ${codigo}`);
      return;
    }
    agregarProducto(producto);
  }

  function cambiarCantidad(id: string, cantidad: number) {
    setLineas((previas) =>
      previas
        .map((l) => (l.producto.id === id ? { ...l, cantidad } : l))
        .filter((l) => l.cantidad > 0),
    );
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.producto.precio_venta_total * l.cantidad, 0);
  const total = Math.max(0, subtotal - descuento);

  async function confirmar() {
    setError(null);
    setMensaje(null);

    const items: ItemVenta[] = lineas.map((l) => ({
      producto_id: l.producto.id,
      cantidad: l.cantidad,
    }));

    try {
      const resultado = await registrar.mutateAsync({
        items,
        medioPago,
        descuento,
        descripcionDescuento,
      });
      setMensaje(`Venta #${resultado.numero} registrada por ${formatCLP(resultado.total)}`);
      setLineas([]);
      setDescuento(0);
      setDescripcionDescuento('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta');
    }
  }

  function abrirDevolucion(ventaId: string) {
    setVentaDevolucion(ventaId);
    setMotivoTipo('buen_estado');
    setMotivoTexto('');
    setSeleccion({});
    setErrorDevolucion(null);
  }

  function cerrarDevolucion() {
    setVentaDevolucion(null);
    setSeleccion({});
    setErrorDevolucion(null);
  }

  async function confirmarDevolucion() {
    if (!detalle) return;
    setErrorDevolucion(null);

    const motivo = MOTIVOS.find((m) => m.valor === motivoTipo);
    const reingresa = motivo?.reingresa ?? true;

    const items: ItemVenta[] = detalle.items
      .filter((item) => (seleccion[item.id] ?? 0) > 0)
      .map((item) => ({
        producto_id: item.producto_id,
        cantidad: seleccion[item.id],
        reingresa_stock: reingresa,
      }));

    if (items.length === 0) {
      setErrorDevolucion('Selecciona al menos un producto y su cantidad');
      return;
    }

    const textoMotivo =
      motivoTipo === 'otro'
        ? motivoTexto || 'Otro motivo'
        : (motivo?.label ?? 'Devolucion');

    try {
      await devolver.mutateAsync({
        items,
        medioPago: detalle.venta.medio_pago,
        motivo: textoMotivo,
        ventaOrigenId: detalle.venta.id,
      });
      setMensaje(
        reingresa
          ? 'Devolucion registrada: el producto vuelve al inventario'
          : 'Devolucion registrada como perdida (no reingresa al inventario)',
      );
      cerrarDevolucion();
    } catch (err) {
      setErrorDevolucion(err instanceof Error ? err.message : 'No se pudo registrar la devolucion');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
        {esMaestro && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void exportar()}
            disabled={exportando || ventas.length === 0}
          >
            {exportando ? 'Exportando...' : 'Exportar a Excel'}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="card space-y-3">
            <BarcodeScanner onScan={agregarPorCodigo} />
            <input
              className="input"
              placeholder="Buscar producto por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
                {productos.slice(0, 8).map((producto) => (
                  <li key={producto.id}>
                    <button
                      type="button"
                      className="flex w-full justify-between py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => agregarProducto(producto)}
                    >
                      <span>{producto.nombre}</span>
                      <span className="text-slate-500">
                        {formatCLP(producto.precio_venta_total)} · stock {producto.stock}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase text-slate-400">Historial de ventas</h2>
              <RangoFiltro
                tipo={tipo}
                onTipo={setTipo}
                desde={desde}
                hasta={hasta}
                onDesde={setDesde}
                onHasta={setHasta}
              />
            </div>

            {ventas.length === 0 ? (
              <p className="text-sm text-slate-500">Sin movimientos en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                      <th className="py-2">#</th>
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Medio</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta) => (
                      <tr key={venta.id} className="border-b border-slate-100">
                        <td className="py-2">{venta.numero}</td>
                        <td className="py-2 text-slate-500">{formatFechaHora(venta.created_at)}</td>
                        <td className="py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              venta.tipo === 'venta'
                                ? 'bg-success-50 text-success-700'
                                : 'bg-warning-50 text-warning-700'
                            }`}
                          >
                            {venta.tipo}
                          </span>
                        </td>
                        <td className="py-2 text-slate-500">{venta.medio_pago}</td>
                        <td className="py-2 text-right">{formatCLP(venta.total)}</td>
                        <td className="py-2 text-slate-500">{venta.estado}</td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-3">
                            {venta.tipo === 'venta' && venta.estado === 'completada' && (
                              <button
                                type="button"
                                className="text-brand-600 hover:underline"
                                onClick={() => abrirDevolucion(venta.id)}
                              >
                                Devolver
                              </button>
                            )}
                            {esMaestro && venta.estado === 'completada' && (
                              <button
                                type="button"
                                className="text-danger-600 hover:underline"
                                onClick={() =>
                                  anular.mutate({
                                    ventaId: venta.id,
                                    motivo: 'Anulada desde ventas',
                                  })
                                }
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Carrito</h2>

          {lineas.length === 0 ? (
            <p className="text-sm text-slate-500">Escanea un producto para comenzar.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lineas.map((linea) => (
                <li key={linea.producto.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {linea.producto.nombre}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatCLP(linea.producto.precio_venta_total)} c/u
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                    value={linea.cantidad}
                    onChange={(e) => cambiarCantidad(linea.producto.id, Number(e.target.value))}
                  />
                </li>
              ))}
            </ul>
          )}

          <div>
            <label className="label">Medio de pago</label>
            <select
              className="input"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPago)}
            >
              {MEDIOS.map((medio) => (
                <option key={medio} value={medio}>
                  {medio}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Descuento</label>
              <input
                type="number"
                min={0}
                className="input"
                value={descuento}
                onChange={(e) => setDescuento(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div>
              <label className="label">Descripcion del descuento</label>
              <input
                className="input"
                placeholder="Opcional"
                value={descripcionDescuento}
                onChange={(e) => setDescripcionDescuento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatCLP(subtotal)}</span>
            </div>
            {descuento > 0 && (
              <div className="flex items-center justify-between text-sm text-danger-600">
                <span>Descuento</span>
                <span>-{formatCLP(descuento)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-semibold text-slate-800">{formatCLP(total)}</span>
            </div>
          </div>

          {mensaje && <p className="text-sm text-success-600">{mensaje}</p>}
          {error && <p className="text-sm text-danger-600">{error}</p>}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={lineas.length === 0 || registrar.isPending}
            onClick={() => void confirmar()}
          >
            {registrar.isPending ? 'Registrando...' : 'Confirmar venta'}
          </button>

          <p className="text-xs text-slate-400">
            El servidor recalcula precios, IVA, total y stock. No se puede vender mas que el stock.
          </p>
        </div>
      </div>

      <Modal
        open={Boolean(ventaDevolucion)}
        onClose={cerrarDevolucion}
        title={`Devolucion de la venta #${detalle?.venta.numero ?? ''}`}
        wide
      >
        {!detalle ? (
          <p className="text-sm text-slate-500">Cargando detalle...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Motivo</label>
              <select
                className="input"
                value={motivoTipo}
                onChange={(e) =>
                  setMotivoTipo(e.target.value as (typeof MOTIVOS)[number]['valor'])
                }
              >
                {MOTIVOS.map((motivo) => (
                  <option key={motivo.valor} value={motivo.valor}>
                    {motivo.label}
                  </option>
                ))}
              </select>
            </div>

            {motivoTipo === 'otro' && (
              <div>
                <label className="label">Detalle del motivo</label>
                <input
                  className="input"
                  value={motivoTexto}
                  onChange={(e) => setMotivoTexto(e.target.value)}
                  placeholder="Describe el motivo"
                />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                    <th className="py-2">Producto</th>
                    <th className="py-2 text-right">Vendidos</th>
                    <th className="py-2 text-right">Devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2">{item.nombre_producto}</td>
                      <td className="py-2 text-right">{item.cantidad}</td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.cantidad}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                          value={seleccion[item.id] ?? 0}
                          onChange={(e) =>
                            setSeleccion((previa) => ({
                              ...previa,
                              [item.id]: Math.min(Number(e.target.value), item.cantidad),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-400">
              Si el motivo es caducado o roto, el producto no vuelve al inventario y queda
              registrado como perdida.
            </p>

            {errorDevolucion && <p className="text-sm text-danger-600">{errorDevolucion}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={devolver.isPending}
                onClick={() => void confirmarDevolucion()}
              >
                {devolver.isPending ? 'Registrando...' : 'Registrar devolucion'}
              </button>
              <button type="button" className="btn-secondary" onClick={cerrarDevolucion}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
