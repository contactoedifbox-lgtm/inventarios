import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RangoFiltro } from '@/components/ui/RangoFiltro';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard, useInventario, useRanking, useReservasResumen } from '@/lib/hooks';
import { formatCLP, formatFecha } from '@/lib/format';
import { hoyISO, rangoDe, type RangoTipo } from '@/lib/dateRanges';

const STOCK_ALERTA = 3;

function Kpi({ titulo, valor, detalle, tono = 'slate' }: {
  titulo: string;
  valor: string;
  detalle?: string;
  tono?: 'slate' | 'brand' | 'amber' | 'red' | 'green';
}) {
  const tonos: Record<string, string> = {
    slate: 'text-ink',
    brand: 'text-brand-700',
    amber: 'text-warning-600',
    red: 'text-danger-600',
    green: 'text-success-600',
  };

  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${tonos[tono]}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { perfil, esMaestro, esCliente } = useAuth();

  const [tipo, setTipo] = useState<RangoTipo>('mes');
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const rango = useMemo(() => rangoDe(tipo, desde, hasta), [tipo, desde, hasta]);

  const [tipoRanking, setTipoRanking] = useState<RangoTipo>('mes');
  const [desdeRanking, setDesdeRanking] = useState(hoyISO());
  const [hastaRanking, setHastaRanking] = useState(hoyISO());
  const rangoRanking = useMemo(
    () => rangoDe(tipoRanking, desdeRanking, hastaRanking),
    [tipoRanking, desdeRanking, hastaRanking],
  );

  const { data: resumen, isLoading } = useDashboard(rango.desde, rango.hasta);
  const { data: reservas } = useReservasResumen();
  const { data: productos = [] } = useInventario('');
  const { data: ranking = [] } = useRanking(rangoRanking.desde, rangoRanking.hasta);

  const alertas = productos.filter((producto) => producto.stock <= STOCK_ALERTA);

  const masVendidos = [...ranking].sort((a, b) => b.unidades - a.unidades).slice(0, 10);
  const menosVendidos = [...ranking]
    .sort((a, b) => a.unidades - b.unidades || b.dias_detenido - a.dias_detenido)
    .slice(0, 10);

  const inventario = resumen?.inventario;
  const ventas = resumen?.ventas;
  const documentos = resumen?.documentos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Hola, {perfil?.nombre_completo ?? 'bienvenido'}
        </h1>
        <p className="text-sm text-slate-500">
          Rol: {esMaestro ? 'Maestro' : esCliente ? 'Cliente' : 'Vendedor'} · Resumen general
        </p>
      </div>

      {/* Inventario */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inventario</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Productos activos" valor={String(inventario?.productos ?? 0)} tono="brand" />
          <Kpi titulo="Unidades en stock" valor={String(inventario?.stock_total ?? 0)} />
          <Kpi
            titulo={`Stock bajo (${STOCK_ALERTA} o menos)`}
            valor={String(inventario?.stock_bajo ?? 0)}
            tono="amber"
          />
          <Kpi titulo="Agotados" valor={String(inventario?.agotados ?? 0)} tono="red" />
        </div>

        {alertas.length > 0 && (
          <details className="card border-warning-100 bg-warning-50" open>
            <summary className="cursor-pointer text-sm font-semibold text-warning-700">
              ⚠ {alertas.length} producto(s) con stock de {STOCK_ALERTA} o menos
            </summary>
            <ul className="mt-3 divide-y divide-warning-100">
              {alertas.map((producto) => (
                <li key={producto.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-warning-700">
                    {producto.nombre}
                    {producto.codigo_barras && (
                      <span className="ml-2 text-xs text-warning-600">{producto.codigo_barras}</span>
                    )}
                  </span>
                  <span className="font-semibold text-warning-700">
                    {producto.stock} u. (min {producto.stock_minimo})
                  </span>
                </li>
              ))}
            </ul>
            <Link to="/inventario" className="mt-3 inline-block text-sm text-warning-700 underline">
              Ir a inventario
            </Link>
          </details>
        )}
      </section>

      {/* Ventas */}
      {!esCliente && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Ventas</h2>
            <RangoFiltro
              tipo={tipo}
              onTipo={setTipo}
              desde={desde}
              hasta={hasta}
              onDesde={setDesde}
              onHasta={setHasta}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              titulo="Monto vendido"
              valor={isLoading ? '...' : formatCLP(ventas?.total ?? 0)}
              detalle={`Neto ${formatCLP(ventas?.neto ?? 0)} · IVA ${formatCLP(ventas?.iva ?? 0)}`}
              tono="green"
            />
            <Kpi titulo="Unidades vendidas" valor={String(ventas?.unidades ?? 0)} />
            <Kpi titulo="Ventas" valor={String(documentos?.ventas ?? 0)} />
            <Kpi titulo="Devoluciones" valor={String(documentos?.devoluciones ?? 0)} tono="amber" />
          </div>
        </section>
      )}

      {/* Reservas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Reservas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi titulo="Hoy" valor={String(reservas?.dia ?? 0)} tono="brand" />
          <Kpi titulo="Esta semana" valor={String(reservas?.semana ?? 0)} />
          <Kpi titulo="Este mes" valor={String(reservas?.mes ?? 0)} />
        </div>
      </section>

      {/* Ranking de productos */}
      {!esCliente && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Rotacion de productos
            </h2>
            <RangoFiltro
              tipo={tipoRanking}
              onTipo={setTipoRanking}
              desde={desdeRanking}
              hasta={hastaRanking}
              onDesde={setDesdeRanking}
              onHasta={setHastaRanking}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Mas vendidos</h3>
              {masVendidos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos en el rango.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                      <th className="py-2">Producto</th>
                      <th className="py-2 text-right">Unidades</th>
                      <th className="py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masVendidos.map((fila) => (
                      <tr key={fila.producto_id} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{fila.nombre}</td>
                        <td className="py-2 text-right font-medium">{fila.unidades}</td>
                        <td className="py-2 text-right">{formatCLP(fila.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Menos vendidos y detenidos
              </h3>
              {menosVendidos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos en el rango.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                      <th className="py-2">Producto</th>
                      <th className="py-2 text-right">Unid.</th>
                      <th className="py-2">Ultima venta</th>
                      <th className="py-2 text-right">Dias detenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menosVendidos.map((fila) => (
                      <tr key={fila.producto_id} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{fila.nombre}</td>
                        <td className="py-2 text-right">{fila.unidades}</td>
                        <td className="py-2 text-slate-500">
                          {fila.ultima_venta ? formatFecha(fila.ultima_venta) : 'sin ventas'}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              fila.dias_detenido >= 60
                                ? 'bg-danger-50 text-danger-700'
                                : fila.dias_detenido >= 30
                                  ? 'bg-warning-50 text-warning-700'
                                  : 'bg-slate-100 text-muted'
                            }`}
                          >
                            {fila.dias_detenido}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
