import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  useActualizarProfesional,
  useActualizarRolPerfil,
  useCrearHorario,
  useCrearProfesional,
  useEliminarHorario,
  useEliminarProfesional,
  useHorariosSemanales,
  useInvitarUsuario,
  useProfesionalesTodos,
  useVincularPerfilProfesional,
} from '@/lib/hooks';
import type {
  GeneroPersonal,
  HorarioSemanal,
  Profesional,
  TipoPersonal,
} from '@/lib/types';

const FORM_VACIO = {
  nombre: '',
  tipo: 'veterinario' as TipoPersonal,
  genero: 'masculino' as GeneroPersonal,
  especialidad: '',
  duracion_slot_min: 30,
  color: '',
  orden: 0,
  activo: true,
  email: '',
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

const TIPO_LABEL: Record<TipoPersonal, Record<GeneroPersonal, string>> = {
  vendedor: { masculino: 'Vendedor', femenino: 'Vendedora' },
  veterinario: { masculino: 'Veterinario', femenino: 'Veterinaria' },
  peluquero: { masculino: 'Peluquero', femenino: 'Peluquera canina' },
};

/** Color de acento por tipo de personal (no editable). */
const COLOR_POR_TIPO: Record<TipoPersonal, string> = {
  veterinario: '#177E89',
  vendedor: '#C83779',
  peluquero: '#35B7C2',
};

function hhmm(hora: string): string {
  return hora.slice(0, 5);
}

/**
 * Genera las horas de inicio de los bloques de un tramo segun la duracion del
 * slot. El ultimo bloque se incluye aunque quede mas corto que el slot (el
 * ajuste siempre va en el ultimo bloque).
 */
function slotsDeRango(inicio: string, fin: string, paso: number): string[] {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const finMin = hf * 60 + mf;
  const slots: string[] = [];

  for (let cursor = hi * 60 + mi; cursor < finMin; cursor += paso) {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  return slots;
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

export function PersonalPage() {
  const { data: profesionales = [], isLoading } = useProfesionalesTodos();
  const { data: horarios = [] } = useHorariosSemanales();
  const crear = useCrearProfesional();
  const actualizar = useActualizarProfesional();
  const actualizarRol = useActualizarRolPerfil();
  const crearHorario = useCrearHorario();
  const eliminarHorario = useEliminarHorario();
  const eliminarProfesional = useEliminarProfesional();
  const invitar = useInvitarUsuario();
  const vincular = useVincularPerfilProfesional();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<Profesional | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [rolMaestro, setRolMaestro] = useState(false);

  const [horarioProfesional, setHorarioProfesional] = useState<Profesional | null>(null);
  const [rangos, setRangos] = useState<Record<number, { inicio: string; fin: string }>>({});
  const [errorHorario, setErrorHorario] = useState<string | null>(null);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setRolMaestro(false);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(profesional: Profesional) {
    setEditando(profesional);
    setForm({
      nombre: profesional.nombre,
      tipo: profesional.tipo,
      genero: profesional.genero,
      especialidad: profesional.especialidad ?? '',
      duracion_slot_min: profesional.duracion_slot_min,
      color: profesional.color ?? '',
      orden: profesional.orden,
      activo: profesional.activo,
      email: profesional.email ?? '',
    });
    setRolMaestro(profesional.perfil_rol === 'maestro');
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
    if (
      form.tipo !== 'vendedor' &&
      (form.duracion_slot_min < 5 || form.duracion_slot_min > 240)
    ) {
      setError('La duracion debe estar entre 5 y 240 minutos');
      return;
    }

    const siguienteOrden =
      profesionales.reduce((max, p) => Math.max(max, p.orden), 0) + 1;
    const payload = {
      ...form,
      color: COLOR_POR_TIPO[form.tipo],
      orden: editando ? editando.orden : siguienteOrden,
    };

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input: payload });
        if (editando.perfil_id) {
          await actualizarRol.mutateAsync({
            perfilId: editando.perfil_id,
            rol: rolMaestro ? 'maestro' : 'vendedor',
          });
        }
        cerrarModal();
        return;
      }

      const profesionalId = await crear.mutateAsync(payload);

      // Si se indico un correo, se crea la cuenta de acceso y se envia el correo
      // para que la persona defina su propia contrasena.
      if (form.email.trim()) {
        const resultado = await invitar.mutateAsync({
          email: form.email.trim(),
          nombre_completo: form.nombre.trim(),
          rol: rolMaestro ? 'maestro' : 'vendedor',
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        });
        await vincular.mutateAsync({ profesionalId, perfilId: resultado.id });

        if (resultado.correo_enviado) {
          setMensaje({
            tipo: 'ok',
            texto: `Se envio un correo a ${form.email.trim()} para que cree su contrasena.`,
          });
        } else {
          setMensaje({
            tipo: 'error',
            texto: `El registro se creo, pero no se pudo enviar el correo: ${
              resultado.error_correo ?? 'error desconocido'
            }`,
          });
        }
      }

      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setErrorEliminar(null);
    try {
      await eliminarProfesional.mutateAsync(porEliminar.id);
      setPorEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  async function alternarActivo(profesional: Profesional) {
    await actualizar.mutateAsync({
      id: profesional.id,
      input: {
        nombre: profesional.nombre,
        tipo: profesional.tipo,
        genero: profesional.genero,
        especialidad: profesional.especialidad,
        duracion_slot_min: profesional.duracion_slot_min,
        color: COLOR_POR_TIPO[profesional.tipo],
        orden: profesional.orden,
        activo: !profesional.activo,
        email: profesional.email,
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
          <h1 className="text-2xl font-bold text-ink">Personal</h1>
          <p className="text-sm text-muted">
            Vendedores, veterinarios y peluqueros. Define su tipo y horario semanal.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={abrirNuevo}>
          Nuevo registro
        </button>
      </div>

      {mensaje && (
        <div
          className={`card flex items-start justify-between gap-3 text-sm ${
            mensaje.tipo === 'ok' ? 'text-success-700' : 'text-danger-600'
          }`}
        >
          <span>{mensaje.texto}</span>
          <button
            type="button"
            className="text-muted hover:text-ink"
            onClick={() => setMensaje(null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="card">
          <p className="text-sm text-muted">Cargando personal...</p>
        </div>
      ) : profesionales.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">Sin personal registrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {profesionales.map((profesional) => {
            const dias = agruparPorDia(horarios, profesional.id);
            const acento = COLOR_POR_TIPO[profesional.tipo];
            const etiqueta = TIPO_LABEL[profesional.tipo][profesional.genero];

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
                        {profesional.especialidad?.trim() || etiqueta}
                      </p>
                    </div>
                  </div>
                  <span className={profesional.activo ? 'badge-success' : 'badge-neutral'}>
                    {profesional.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </header>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-brand">{etiqueta}</span>
                  {profesional.tipo !== 'vendedor' && (
                    <span className="badge-neutral">Slot {profesional.duracion_slot_min} min</span>
                  )}
                  {profesional.email && (
                    <span className="badge-neutral">{profesional.email}</span>
                  )}
                  {profesional.perfil_id && <span className="badge-success">Con acceso</span>}
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
                    <button
                      type="button"
                      className="text-sm font-medium text-danger-600 transition-colors hover:underline"
                      onClick={() => setPorEliminar(profesional)}
                    >
                      Eliminar
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal personal */}
      <Modal
        open={modalAbierto}
        onClose={cerrarModal}
        title={editando ? 'Editar registro' : 'Nuevo registro'}
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
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPersonal })}
              >
                <option value="vendedor">Vendedor</option>
                <option value="veterinario">Veterinario</option>
                <option value="peluquero">Peluquero</option>
              </select>
            </div>
            <div>
              <label className="label">Genero</label>
              <select
                className="input"
                value={form.genero}
                onChange={(e) => setForm({ ...form, genero: e.target.value as GeneroPersonal })}
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
          </div>

          {form.tipo !== 'vendedor' && (
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
          )}

          <div>
            <label className="label">Especialidad (texto libre)</label>
            <input
              className="input"
              placeholder="Veterinario general, Radiologo, Peluqueria y bano..."
              value={form.especialidad}
              onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Correo de acceso (opcional)</label>
            <input
              type="email"
              className="input"
              placeholder="persona@correo.cl"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted">
              Si indicas un correo, se crea una cuenta y la persona define su propia contrasena con
              el enlace que se envia.
            </p>
          </div>

          {(editando?.perfil_id || form.email.trim()) && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={rolMaestro}
                onChange={(e) => setRolMaestro(e.target.checked)}
              />
              Dar acceso de <strong>maestro</strong> (gestiona todo el sistema)
            </label>
          )}

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
            el registro. Los vendedores no aparecen en la agenda.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={crear.isPending || actualizar.isPending}
            >
              {editando ? 'Guardar cambios' : 'Crear registro'}
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
              {horarioProfesional.tipo === 'vendedor'
                ? 'Agrega uno o mas tramos por dia para registrar su jornada laboral.'
                : `Agrega uno o mas tramos por dia. Los bloques de la agenda se generan automaticamente segun la duracion del slot (${horarioProfesional.duracion_slot_min} min).`}
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

                    {filas.length > 0 && horarioProfesional.tipo !== 'vendedor' && (
                      <div className="mt-2 pl-0 sm:pl-24">
                        <p className="mb-1 text-xs text-muted">
                          Bloques de {horarioProfesional.duracion_slot_min} min (
                          {filas.reduce(
                            (total, fila) =>
                              total +
                              slotsDeRango(
                                fila.hora_inicio,
                                fila.hora_fin,
                                horarioProfesional.duracion_slot_min,
                              ).length,
                            0,
                          )}
                          )
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {filas.flatMap((fila) =>
                            slotsDeRango(
                              fila.hora_inicio,
                              fila.hora_fin,
                              horarioProfesional.duracion_slot_min,
                            ).map((hora) => (
                              <span
                                key={`${fila.id}-${hora}`}
                                className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-line"
                              >
                                {hora}
                              </span>
                            )),
                          )}
                        </div>
                      </div>
                    )}

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

      {/* Modal eliminar */}
      <Modal
        open={Boolean(porEliminar)}
        onClose={() => setPorEliminar(null)}
        title="Eliminar registro"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Vas a eliminar a <strong>{porEliminar?.nombre}</strong>, junto con sus reservas y su
            cuenta de acceso. Esta accion no se puede deshacer.
          </p>
          {errorEliminar && <p className="text-sm text-danger-600">{errorEliminar}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-danger flex-1"
              disabled={eliminarProfesional.isPending}
              onClick={() => void confirmarEliminar()}
            >
              {eliminarProfesional.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPorEliminar(null)}>
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
