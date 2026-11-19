import type { RangoTipo } from '@/lib/dateRanges';

interface RangoFiltroProps {
  tipo: RangoTipo;
  onTipo: (tipo: RangoTipo) => void;
  desde: string;
  hasta: string;
  onDesde: (valor: string) => void;
  onHasta: (valor: string) => void;
}

const OPCIONES: { valor: RangoTipo; label: string }[] = [
  { valor: 'dia', label: 'Dia' },
  { valor: 'semana', label: 'Semana' },
  { valor: 'mes', label: 'Mes' },
  { valor: 'anio', label: 'Año' },
  { valor: 'rango', label: 'Rango' },
];

export function RangoFiltro({ tipo, onTipo, desde, hasta, onDesde, onHasta }: RangoFiltroProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex overflow-hidden rounded-lg border border-slate-300">
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => onTipo(opcion.valor)}
            className={`px-3 py-1.5 text-sm ${
              tipo === opcion.valor
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      {tipo === 'rango' && (
        <>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs text-slate-400">Desde</span>
            <input
              type="date"
              className="input"
              value={desde}
              onChange={(e) => onDesde(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs text-slate-400">Hasta</span>
            <input
              type="date"
              className="input"
              value={hasta}
              onChange={(e) => onHasta(e.target.value)}
            />
          </label>
        </>
      )}
    </div>
  );
}