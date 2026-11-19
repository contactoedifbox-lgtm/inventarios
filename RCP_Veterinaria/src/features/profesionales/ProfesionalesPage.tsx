import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  useActualizarProfesional,
  useCrearHorario,
  useCrearProfesional,
  useEliminarHorario,
  useHorariosSemanales,
  useProfesionalesTodos,
} from '@/lib/hooks';
import type { AreaAgenda, HorarioSemanal, Profesional } from '@/lib/types';

const FORM_VACIO = {
  nombre: '',
  area: 'veterinaria' as AreaAgenda,
  especialidad: '',
  duracion_slot_min: 30,
  color: '',
  orden: 0,
  activo: true,
};

const DIAS = [
  { valor: 1, label: 'Lunes' },
  { valor: 2, label: 'Martes' },
  { valor: 3, label: 'Miercoles' },
  { valor: 4, label: 'Jueves' },
  { valor: 5, label: 'Viernes' },
  { valor: 6, label: 'Sabado' },
  { valor: 7, label: 'Domingo' },
];

const AREA_LABEL: Record<AreaAgenda, string> = {
  veterinaria: 'Veterinaria',
  peluqueria: 'Peluqueria',
};

function hhmm(hora: string): string {
  return hora.slice(0, 5);
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

interface TramoDia {
  dia: number;
  label: string;
  tramos: HorarioSemanal[];
}

function agruparPorDia(horarios: HorarioSemanal[], profesionalId: string): TramoDia[] {
  return DIAS.map((dia) => ({
    dia: dia.valor,
    label: dia.label,
    tramos: horarios
      .filter((h) => h.profesional_id === profesionalId && h.dia_semana === dia.valor)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  })).filter((d) => d.tramos.length > 0);
}

export function ProfesionalesPage() {
  const { data: profesionales = [], isLoading } = useProfesionalesTodos();
  const { data: horarios = [] } = useHorariosSemanales();
  const crear = useCrearProfesional();
  const actualizar = useActualizarProfesional();
  const crearHorario = useCrearHorario();
  const eliminarHorario = useEliminarHorario();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);

  const [horarioProfesional, setHorarioProfesional] = useState<Profesional | null>(null);
  const [rangos, setRangos] = useState<Record<number, { inicio: string; fin: string }>>({});
  const [errorHorario, setErrorHorario] = useState<string | null>(null);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(profesional: Profesional) {
    setEditando(profesional);
    setForm({
      nombre: profesional.nombre,
      area: profesional.area,
      especialidad: profesional.especialidad ?? '',
      duracion_slot_min: profesional.duracion_slot_min,
      color: profesional.color ?? '',
      orden: profesional.orden,
      activo: profesional.activo,
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

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (form.duracion_slot_min < 5 || form.duracion_slot_min > 240) {
      setError('La duracion debe estar entre 5 y 240 minutos');
      return;
    }

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input: form });
      } else {
        await crear.mutateAsync(form);
      }
      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function alternarActivo(profesional: Profesional) {
    await actualizar.mutateAsync({
      id: profesional.id,
      input: {
        nombre: profesional.nombre,
        area: profesional.area,
        especialidad: profesional.especialidad,
        duracion_slot_min: profesional.duracion_slot_min,
        color: profesional.color,
        orden: profesional.orden,
        activo: !profesional.activo,
      },
    });
  }

  function abrirHorario(profesional: Profesional) {
    setHorarioProfesional(profesional);
    setRangos({});
    setErrorHorario(null);
  }

  function cerrarHorario() {
    setHorarioProfesional(null);
    setErrorHorario(null);
  }

  async function agregarRango(dia: number) {
    if (!horarioProfesional) return;
    setErrorHorario(null);

    const rango = rangos[dia] ?? { inicio: '09:00', fin: '18:00' };
    if (!rango.inicio || !rango.fin) {
      setErrorHorario('Indica hora de inicio y fin');
      return;
    }
    if (rango.fin <= rango.inicio) {
      setErrorHorario('La hora de fin debe ser posterior a la de inicio');
      return;
    }

    try {
      await crearHorario.mutateAsync({
        profesional_id: horarioProfesional.id,
        dia_semana: dia,
        hora_inicio: rango.inicio,
        hora_fin: rango.fin,
      });
    } catch (err) {
      setErrorHorario(err instanceof Error ? err.message : 'No se pudo agregar el horario');
    }
  }

  async function quitarRango(id: string) {
    setErrorHorario(null);
    try {
      await eliminarHorario.mutateAsync(id);
    } catch (err) {
      setErrorHorario(err instanceof Error ? err.message : 'No se pudo eliminar el horario');
    }
  }

  const horariosProfesional = horarioProfesional
    ? horarios.filter((h) => h.profesional_id === horarioProfesional.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Profesionales</h1>
          <p className="text-sm text-muted">
            Define la especialidad y el horario semanal de cada profesional.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={abrirNuevo}>
          Nuevo profesional
        </button>
      </div>

      {isLoading ? (
        <div className="card">
          <p className="text-sm text-muted">Cargando profesionales...</p>
        </div>
      ) : profesionales.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">Sin profesionales registrados.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {profesionales.map((profesional) => {
            const dias = agruparPorDia(horarios, profesional.id);
            const acento = profesional.color || '#177E89';

            return (
              <article
                key={profesional.id}
                className="card card-hover flex flex-col gap-4"
                style={{ borderTop: `4px solid ${acento}` }}
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                      style={{ background: acento }}
                      aria-hidden
                    >
                      {iniciales(profesional.nombre)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-ink">
                        {profesional.nombre}
                      </h3>
                      <p className="truncate text-sm text-muted">
                        {profesional.especialidad?.trim() || 'Sin especialidad'}
                      </p>
                    </div>
                  </div>
                  <span className={profesional.activo ? 'badge-success' : 'badge-neutral'}>
                    {profesional.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </header>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-brand">{AREA_LABEL[profesional.area]}</span>
                  <span className="badge-neutral">Slot {profesional.duracion_slot_min} min</span>
                  <span className="badge-neutral">Orden {profesional.orden}</span>
                </div>

                <div className="rounded-xl border border-line bg-canvas/50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Horario semanal
                  </p>
                  {dias.length === 0 ? (
                    <p className="text-sm text-muted">Sin horario definido</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {dias.map((dia) => (
                        <li key={dia.dia} className="flex items-start gap-3">
                          <span className="w-24 shrink-0 pt-0.5 text-sm text-muted">
                            {dia.label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {dia.tramos.map((tramo) => (
                              <span key={tramo.id} className="badge-brand font-mono">
                                {hhmm(tramo.hora_inicio)}–{hhmm(tramo.hora_fin)}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => abrirHorario(profesional)}
                  >
                    Horario semanal
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => abrirEditar(profesional)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-muted transition-colors hover:text-brand-700"
                      onClick={() => void alternarActivo(profesional)}
                    >
                      {profesional.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal profesional */}
      <Modal
        open={modalAbierto}
        onClose={cerrarModal}
        title={editando ? 'Editar profesional' : 'Nuevo profesional'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Area</label>
              <select
                className="input"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value as AreaAgenda })}
              >
                <option value="veterinaria">Veterinaria</option>
                <option value="peluqueria">Peluqueria</option>
              </select>
            </div>
            <div>
              <label className="label">Duracion del slot (min)</label>
              <input
                type="number"
                min={5}
                max={240}
                className="input"
                value={form.duracion_slot_min}
                onChange={(e) => setForm({ ...form, duracion_slot_min: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="label">Especialidad (texto libre)</label>
            <input
              className="input"
              placeholder="Veterinario general, Radiologo, Imagenologia, Peluqueria y bano..."
              value={form.especialidad}
              onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Color (opcional)</label>
              <input
                className="input"
                placeholder="#2563eb"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Orden</label>
              <input
                type="number"
                className="input"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
          </label>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <p className="text-xs text-muted">
            El horario semanal se define con el boton <strong>Horario semanal</strong> una vez creado
            el profesional.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={crear.isPending || actualizar.isPending}
            >
              {editando ? 'Guardar cambios' : 'Crear profesional'}
            </button>
            <button type="button" className="btn-secondary" onClick={cerrarModal}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal horario semanal */}
      <Modal
        open={Boolean(horarioProfesional)}
        onClose={cerrarHorario}
        title={`Horario de ${horarioProfesional?.nombre ?? ''}`}
        wide
      >
        {horarioProfesional && (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Agrega uno o mas tramos por dia. Los bloques de la agenda se generan automaticamente
              segun la duracion del slot ({horarioProfesional.duracion_slot_min} min).
            </p>

            <div className="space-y-3">
              {DIAS.map((dia) => {
                const filas = horariosProfesional
                  .filter((h) => h.dia_semana === dia.valor)
                  .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                const rango = rangos[dia.valor] ?? { inicio: '09:00', fin: '18:00' };

                return (
                  <div
                    key={dia.valor}
                    className="rounded-xl border border-line bg-canvas/40 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-24 shrink-0 text-sm font-semibold text-ink">
                        {dia.label}
                      </span>
                      <div className="flex min-w-[8rem] flex-1 flex-wrap items-center gap-1.5">
                        {filas.length === 0 ? (
                          <span className="text-xs text-muted">Sin tramos</span>
                        ) : (
                          filas.map((fila) => (
                            <span
                              key={fila.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                            >
                              <span className="font-mono">
                                {hhmm(fila.hora_inicio)}–{hhmm(fila.hora_fin)}
                              </span>
                              <button
                                type="button"
                                className="text-brand-600 transition-colors hover:text-danger-600"
                                onClick={() => void quitarRango(fila.id)}
                                aria-label="Quitar tramo"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-end gap-2 pl-0 sm:pl-24">
                      <label className="text-xs text-muted">
                        <span className="mb-1 block">Desde</span>
                        <input
                          type="time"
                          className="input"
                          value={rango.inicio}
                          onChange={(e) =>
                            setRangos((previa) => ({
                              ...previa,
                              [dia.valor]: { ...rango, inicio: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="text-xs text-muted">
                        <span className="mb-1 block">Hasta</span>
                        <input
                          type="time"
                          className="input"
                          value={rango.fin}
                          onChange={(e) =>
                            setRangos((previa) => ({
                              ...previa,
                              [dia.valor]: { ...rango, fin: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={crearHorario.isPending}
                        onClick={() => void agregarRango(dia.valor)}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errorHorario && <p className="text-sm text-danger-600">{errorHorario}</p>}

            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={cerrarHorario}>
                Listo
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
