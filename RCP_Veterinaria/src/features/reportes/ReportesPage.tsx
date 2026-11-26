import { useMemo, useState } from 'react';
import { useReporte } from '@/lib/hooks';
import { formatCLP } from '@/lib/format';

function rangoMes(): { desde: string; hasta: string } {
  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

export function ReportesPage() {
  const inicial = useMemo(rangoMes, []);
  const [desde, setDesde] = useState(inicial.desde.slice(0, 10));
  const [hasta, setHasta] = useState(inicial.hasta.slice(0, 10));
  const [agrupar, setAgrupar] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [exportando, setExportando] = useState(false);

  const desdeIso = new Date(`${desde}T00:00:00`).toISOString();
  const hastaIso = new Date(`${hasta}T00:00:00`).toISOString();

  const { data: filas = [], isLoading } = useReporte(desdeIso, hastaIso, agrupar);

  async function exportar() {
    setExportando(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('Reporte');

      // Sin columnas de costo: apto para Vendedores.
      hoja.columns = [
        { header: 'Producto', key: 'nombre_producto', width: 32 },
        { header: 'Periodo', key: 'periodo', width: 14 },
        { header: 'Unidades', key: 'unidades', width: 12 },
        { header: 'Neto', key: 'total_neto', width: 14 },
        { header: 'IVA', key: 'total_iva', width: 12 },
        { header: 'Total', key: 'total', width: 14 },
      ];

      filas.forEach((fila) => hoja.addRow(fila));

      const buffer = await libro.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `reporte-ventas-${desde}-${hasta}.xlsx`;
      enlace.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void exportar()}
          disabled={exportando || filas.length === 0}
        >
          {exportando ? 'Exportando...' : 'Exportar a Excel'}
        </button>
      </div>

      <div className="card grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div>
          <label className="label">Agrupar por</label>
          <select
            className="input"
            value={agrupar}
            onChange={(e) => setAgrupar(e.target.value as 'dia' | 'semana' | 'mes')}
          >
            <option value="dia">Dia</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-slate-500">Calculando reporte...</p>
        ) : filas.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ventas en el periodo seleccionado.</p>
        ) : (
          <table className="tabla-movil w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Producto</th>
                <th className="py-2">Periodo</th>
                <th className="py-2 text-right">Unidades</th>
                <th className="py-2 text-right">Neto</th>
                <th className="py-2 text-right">IVA</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={`${fila.producto_id}-${fila.periodo}`} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700" data-label="Producto">
                    {fila.nombre_producto}
                  </td>
                  <td className="py-2 text-slate-500" data-label="Periodo">
                    {fila.periodo}
                  </td>
                  <td className="py-2 text-right" data-label="Unidades">
                    {fila.unidades}
                  </td>
                  <td className="py-2 text-right" data-label="Neto">
                    {formatCLP(fila.total_neto)}
                  </td>
                  <td className="py-2 text-right" data-label="IVA">
                    {formatCLP(fila.total_iva)}
                  </td>
                  <td className="py-2 text-right font-medium" data-label="Total">
                    {formatCLP(fila.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
