import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { RangoFiltro } from '@/components/ui/RangoFiltro';
import { CampoRut } from '@/components/ui/CampoRut';
import { CampoTelefono } from '@/components/ui/CampoTelefono';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useActualizarMisDatos,
  useAgendaOcupacion,
  useCambiarEstadoReserva,
  useCancelarMiReserva,
  useClientesConMascotas,
  useCrearCliente,
  useCrearMascota,
  useCrearReservaCliente,
  useCrearReservaInterna,
  useExcepciones,
  useHorariosDisponibles,
  useHorariosSemanales,
  useMascotasCliente,
  useMisDatos,
  useMisReservas,
  useProfesionales,
  useReservasDia,
} from '@/lib/hooks';
import { formatFecha, formatFechaHora, formatHora, normalizarTelefono } from '@/lib/format';
import {
  chileAUtc,
  diaSemanaISO,
  hoyISO,
  rangoDe,
  rangoDiaLocal,
  type RangoTipo,
} from '@/lib/dateRanges';
import { clienteSchema, mascotaSchema } from '@/lib/schemas';
import { normalizarRut, validarRut } from '@/lib/rut';
import type { Especie, Profesional, ReservaDetalle } from '@/lib/types';

type EstadoBloque = 'libre' | 'reservado' | 'fuera_horario' | 'cerrado';

interface Bloque {
  key: string;
  profesionalId: string;
  inicio: Date;
  fin: Date;
  estado: EstadoBloque;
  reserva?: ReservaDetalle;
}

function solapan(aIni: Date, aFin: Date, bIni: Date, bFin: Date): boolean {
  return aIni < bFin && bIni < aFin;
}

function mismoInstante(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

const CLIENTE_VACIO = { nombres: '', apellidos: '', rut: '', telefono: '', email: '' };
const MASCOTA_VACIA = { nombre: '', especie: 'perro' as Especie, raza: '', peso_kg: '' };

const DIAS_NOMBRE: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
  7: 'Domingo',
};

export function AgendaPage() {
  const { esCliente } = useAuth();
  const [fecha, setFecha] = useState(hoyISO());
  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('todos');

  const [histTipo, setHistTipo] = useState<RangoTipo>('mes');
  const [histDesde, setHistDesde] = useState(hoyISO());
  const [histHasta, setHistHasta] = useState(hoyISO());
  const histRango = useMemo(
    () => rangoDe(histTipo, histDesde, histHasta),
    [histTipo, histDesde, histHasta],
  );

  const { data: profesionales = [] } = useProfesionales();
  const { data: horarios = [] } = useHorariosSemanales();
  const { data: excepciones = [] } = useExcepciones(fecha, fecha);
  const rango = useMemo(() => rangoDiaLocal(fecha), [fecha]);
  const { data: reservas = [], isLoading } = useReservasDia(rango.desde, rango.hasta);
  const { data: historial = [] } = useReservasDia(histRango.desde, histRango.hasta);
  const { data: ocupacion = [] } = useAgendaOcupacion(rango.desde, rango.hasta);
  const { data: misReservas = [] } = useMisReservas();
  const { data: misDatos } = useMisDatos();

  const cambiarEstado = useCambiarEstadoReserva();
  const cancelarMiReserva = useCancelarMiReserva();
  const crearReservaInterna = useCrearReservaInterna();
  const crearReservaCliente = useCrearReservaCliente();

  const [detalle, setDetalle] = useState<ReservaDetalle | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Modal nueva reserva
  const [modalNueva, setModalNueva] = useState(false);
  const [nuevaProfesional, setNuevaProfesional] = useState('');
  const [nuevaInicio, setNuevaInicio] = useState('');
  const [nuevaFin, setNuevaFin] = useState('');
  const [nuevaMotivo, setNuevaMotivo] = useState('');
  const [nuevaForzar, setNuevaForzar] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [debouncedCliente, setDebouncedCliente] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [mascotaId, setMascotaId] = useState<string | null>(null);
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState(CLIENTE_VACIO);
  const [nuevaMascota, setNuevaMascota] = useState(MASCOTA_VACIA);
  const [errorNueva, setErrorNueva] = useState<string | null>(null);
  const [datosCliente, setDatosCliente] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    telefono: '',
  });
  const [mascotaCliente, setMascotaCliente] = useState(MASCOTA_VACIA);

  const { data: clientes = [] } = useClientesConMascotas(debouncedCliente);
  const { data: mascotasCliente = [] } = useMascotasCliente(clienteId);
  const { data: slots = [] } = useHorariosDisponibles(nuevaProfesional || null, fecha, fecha, true);
  const crearCliente = useCrearCliente();
  const crearMascota = useCrearMascota();
  const actualizarMisDatos = useActualizarMisDatos();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCliente(busquedaCliente), 250);
    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  // Precarga los datos del cliente al abrir el modal (una sola vez por apertura),
  // para no borrar lo que el usuario ya escribio si la consulta se refresca.
  const prefillHecho = useRef(false);
  useEffect(() => {
    if (!modalNueva) {
      prefillHecho.current = false;
      return;
    }
    if (esCliente && misDatos?.cliente && !prefillHecho.current) {
      setDatosCliente({
        nombres: misDatos.cliente.nombres === 'ANONIMO' ? '' : misDatos.cliente.nombres,
        apellidos: misDatos.cliente.apellidos === 'ANONIMO' ? '' : misDatos.cliente.apellidos,
        rut: misDatos.cliente.rut === 'ANONIMO' ? '' : misDatos.cliente.rut,
        telefono: misDatos.cliente.telefono === 'ANONIMO' ? '' : misDatos.cliente.telefono,
      });
      setMascotaCliente(MASCOTA_VACIA);
      prefillHecho.current = true;
    }
  }, [modalNueva, esCliente, misDatos]);

  const datosCompletos = Boolean(
    misDatos?.cliente &&
      misDatos.cliente.nombres &&
      misDatos.cliente.nombres !== 'ANONIMO' &&
      misDatos.cliente.apellidos &&
      misDatos.cliente.apellidos !== 'ANONIMO' &&
      misDatos.cliente.rut &&
      misDatos.cliente.rut !== 'ANONIMO' &&
      misDatos.cliente.telefono &&
      misDatos.cliente.telefono !== 'ANONIMO',
  );
  const tieneMascotas = (misDatos?.mascotas.length ?? 0) > 0;
  const requiereCompletar = esCliente && (!datosCompletos || !tieneMascotas);

  const bloques = useMemo<Bloque[]>(() => {
    const dow = diaSemanaISO(fecha);
    const resultado: Bloque[] = [];

    const visibles = profesionales.filter(
      (p) => profesionalFiltro === 'todos' || p.id === profesionalFiltro,
    );

    for (const profesional of visibles) {
      const ventanas = horarios
        .filter((h) => h.profesional_id === profesional.id && h.dia_semana === dow)
        .map((h) => ({ inicio: h.hora_inicio, fin: h.hora_fin }));

      for (const excepcion of excepciones) {
        const aplica =
          excepcion.profesional_id === profesional.id ||
          (excepcion.profesional_id === null && excepcion.area === profesional.area);
        if (!aplica || excepcion.modo !== 'abrir' || !excepcion.hora_inicio || !excepcion.hora_fin) {
          continue;
        }
        ventanas.push({ inicio: excepcion.hora_inicio, fin: excepcion.hora_fin });
      }

      const cierres = excepciones.filter((e) => {
        const aplica =
          e.profesional_id === profesional.id ||
          (e.profesional_id === null && e.area === profesional.area);
        return aplica && e.modo === 'cerrar';
      });

      const ocupados = esCliente
        ? ocupacion
            .filter((o) => o.profesional_id === profesional.id)
            .map((o) => ({
              id: `${o.profesional_id}-${o.inicio}`,
              inicio: o.inicio,
              fin: o.fin,
              detalle: undefined as ReservaDetalle | undefined,
            }))
        : reservas
            .filter((r) => r.profesional_id === profesional.id && r.estado !== 'cancelada')
            .map((r) => ({ id: r.id, inicio: r.inicio, fin: r.fin, detalle: r }));

      const cubiertas = new Set<string>();

      for (const ventana of ventanas) {
        const inicioVentana = chileAUtc(fecha, ventana.inicio);
        const finVentana = chileAUtc(fecha, ventana.fin);
        const paso = profesional.duracion_slot_min;

        for (
          let cursor = new Date(inicioVentana);
          cursor < finVentana;
          cursor = new Date(cursor.getTime() + paso * 60000)
        ) {
          const inicio = new Date(cursor);
          const fin = new Date(cursor.getTime() + paso * 60000);
          if (fin > finVentana) break;

          const ocupado = ocupados.find((o) =>
            solapan(inicio, fin, new Date(o.inicio), new Date(o.fin)),
          );

          const cerrado = cierres.some((e) => {
            if (!e.hora_inicio || !e.hora_fin) return true;
            return solapan(
              inicio,
              fin,
              chileAUtc(fecha, e.hora_inicio),
              chileAUtc(fecha, e.hora_fin),
            );
          });

          if (ocupado) cubiertas.add(ocupado.id);

          resultado.push({
            key: `${profesional.id}-${inicio.toISOString()}`,
            profesionalId: profesional.id,
            inicio,
            fin,
            estado: ocupado ? 'reservado' : cerrado ? 'cerrado' : 'libre',
            reserva: ocupado?.detalle,
          });
        }
      }

      for (const ocupado of ocupados) {
        if (cubiertas.has(ocupado.id)) continue;
        resultado.push({
          key: `${profesional.id}-${ocupado.id}`,
          profesionalId: profesional.id,
          inicio: new Date(ocupado.inicio),
          fin: new Date(ocupado.fin),
          estado: 'fuera_horario',
          reserva: ocupado.detalle,
        });
      }
    }

    return resultado.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  }, [profesionales, horarios, excepciones, reservas, ocupacion, esCliente, fecha, profesionalFiltro]);

  function abrirNueva(profesionalId: string, inicio?: Date, fin?: Date) {
    setNuevaProfesional(profesionalId);
    setNuevaInicio(inicio ? inicio.toISOString() : '');
    setNuevaFin(fin ? fin.toISOString() : '');
    setNuevaMotivo('');
    setNuevaForzar(false);
    setBusquedaCliente('');
    setDebouncedCliente('');
    setClienteId(null);
    setMascotaId(misDatos?.mascotas[0]?.id ?? null);
    setModoNuevoCliente(false);
    setNuevoCliente(CLIENTE_VACIO);
    setNuevaMascota(MASCOTA_VACIA);
    setErrorNueva(null);
    setModalNueva(true);
  }

  function cerrarNueva() {
    setModalNueva(false);
    setErrorNueva(null);
  }

  async function guardarClienteNuevo() {
    setErrorNueva(null);

    const clienteParsed = clienteSchema.safeParse(nuevoCliente);
    if (!clienteParsed.success) {
      setErrorNueva(clienteParsed.error.issues[0]?.message ?? 'Datos del cliente invalidos');
      return;
    }
    const mascotaParsed = mascotaSchema.safeParse({
      nombre: nuevaMascota.nombre,
      especie: nuevaMascota.especie,
      raza: nuevaMascota.raza,
      peso_kg: nuevaMascota.peso_kg ? Number(nuevaMascota.peso_kg) : undefined,
    });
    if (!mascotaParsed.success) {
      setErrorNueva(mascotaParsed.error.issues[0]?.message ?? 'Datos de la mascota invalidos');
      return;
    }

    try {
      const id = await crearCliente.mutateAsync({
        nombres: clienteParsed.data.nombres,
        apellidos: clienteParsed.data.apellidos,
        rut: normalizarRut(clienteParsed.data.rut),
        telefono: normalizarTelefono(clienteParsed.data.telefono),
        email: clienteParsed.data.email || null,
      });
      await crearMascota.mutateAsync({
        cliente_id: id,
        nombre: mascotaParsed.data.nombre,
        especie: mascotaParsed.data.especie,
        raza: mascotaParsed.data.raza || null,
        peso_kg: mascotaParsed.data.peso_kg ?? null,
      });
      setClienteId(id);
      setModoNuevoCliente(false);
      setBusquedaCliente(`${clienteParsed.data.nombres} ${clienteParsed.data.apellidos}`);
    } catch (err) {
      setErrorNueva(err instanceof Error ? err.message : 'No se pudo crear el cliente');
    }
  }

  async function guardarReserva(evento: FormEvent) {
    evento.preventDefault();
    setErrorNueva(null);

    if (!nuevaProfesional || !nuevaInicio) {
      setErrorNueva('Selecciona profesional y horario');
      return;
    }

    try {
      if (esCliente) {
        if (!misDatos?.cliente) {
          setErrorNueva('No tienes una ficha de cliente asociada');
          return;
        }

        let mascotaFinal: string | null = mascotaId === '__nueva__' ? null : mascotaId;

        if (requiereCompletar) {
          if (!datosCliente.nombres.trim() || !datosCliente.apellidos.trim()) {
            setErrorNueva('Completa tu nombre y apellido');
            return;
          }
          if (!validarRut(datosCliente.rut)) {
            setErrorNueva('Ingresa un RUT valido');
            return;
          }
          if (!datosCliente.telefono.trim()) {
            setErrorNueva('Ingresa tu telefono');
            return;
          }

          await actualizarMisDatos.mutateAsync({
            nombres: datosCliente.nombres,
            apellidos: datosCliente.apellidos,
            rut: normalizarRut(datosCliente.rut),
            telefono: normalizarTelefono(datosCliente.telefono),
          });

          if (!tieneMascotas) {
            if (!mascotaCliente.nombre.trim()) {
              setErrorNueva('Ingresa el nombre de tu mascota');
              return;
            }
            mascotaFinal = await crearMascota.mutateAsync({
              cliente_id: misDatos.cliente.id,
              nombre: mascotaCliente.nombre,
              especie: mascotaCliente.especie,
              raza: mascotaCliente.raza || null,
              peso_kg: mascotaCliente.peso_kg ? Number(mascotaCliente.peso_kg) : null,
            });
          }
        } else if (mascotaId === '__nueva__') {
          if (!mascotaCliente.nombre.trim()) {
            setErrorNueva('Ingresa el nombre de tu mascota');
            return;
          }
          mascotaFinal = await crearMascota.mutateAsync({
            cliente_id: misDatos.cliente.id,
            nombre: mascotaCliente.nombre,
            especie: mascotaCliente.especie,
            raza: mascotaCliente.raza || null,
            peso_kg: mascotaCliente.peso_kg ? Number(mascotaCliente.peso_kg) : null,
          });
        }

        await crearReservaCliente.mutateAsync({
          profesionalId: nuevaProfesional,
          mascotaId: mascotaFinal,
          inicio: nuevaInicio,
          motivo: nuevaMotivo || undefined,
        });
      } else {
        if (!clienteId) {
          setErrorNueva('Selecciona o crea un cliente');
          return;
        }
        await crearReservaInterna.mutateAsync({
          profesional_id: nuevaProfesional,
          cliente_id: clienteId,
          mascota_id: mascotaId,
          inicio: nuevaInicio,
          motivo: nuevaMotivo || null,
          forzar_fuera_horario: nuevaForzar,
        });
      }
      cerrarNueva();
    } catch (err) {
      setErrorNueva(err instanceof Error ? err.message : 'No se pudo crear la reserva');
    }
  }

  async function cancelarReservaPersonal(reservaId: string) {
    setErrorDetalle(null);
    try {
      await cambiarEstado.mutateAsync({
        reservaId,
        estado: 'cancelada',
        motivo: 'Cancelada desde agenda',
      });
      setDetalle(null);
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : 'No se pudo cancelar la reserva');
    }
  }

  async function cancelarReservaCliente(reservaId: string) {
    try {
      await cancelarMiReserva.mutateAsync({ id: reservaId, motivo: 'Cancelada por el cliente' });
    } catch {
      // El error se refleja al recargar la lista.
    }
  }

  async function exportarHistorial() {
    const ExcelJS = (await import('exceljs')).default;
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Consultas');

    hoja.columns = [
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Hora', key: 'hora', width: 8 },
      { header: 'Profesional', key: 'profesional', width: 24 },
      { header: 'Dueno', key: 'dueno', width: 28 },
      { header: 'RUT', key: 'rut', width: 14 },
      { header: 'Telefono', key: 'telefono', width: 16 },
      { header: 'Mascota', key: 'mascota', width: 18 },
      { header: 'Especie', key: 'especie', width: 12 },
      { header: 'Motivo', key: 'motivo', width: 30 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Origen', key: 'origen', width: 10 },
    ];

    historial.forEach((reserva) =>
      hoja.addRow({
        fecha: formatFecha(reserva.inicio),
        hora: formatHora(reserva.inicio),
        profesional: nombreProfesional(reserva.profesional_id),
        dueno: reserva.clientes
          ? `${reserva.clientes.nombres} ${reserva.clientes.apellidos}`
          : '',
        rut: reserva.clientes?.rut ?? '',
        telefono: reserva.clientes?.telefono ?? '',
        mascota: reserva.mascotas?.nombre ?? '',
        especie: reserva.mascotas?.especie ?? '',
        motivo: reserva.motivo ?? '',
        estado: reserva.estado,
        origen: reserva.origen,
      }),
    );

    const buffer = await libro.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `consultas-${histTipo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const colorBloque: Record<EstadoBloque, string> = {
    libre: 'border-success-100 bg-success-50 text-success-700 hover:bg-success-100',
    reservado: 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700',
    fuera_horario: 'border-warning-100 bg-warning-50 text-warning-700 hover:bg-warning-100',
    cerrado: 'border-line bg-slate-100 text-muted',
  };

  const nombreProfesional = (id: string) =>
    profesionales.find((p) => p.id === id)?.nombre ?? id.slice(0, 8);

  const diasTrabaja = (profesionalId: string) => {
    const dias = [
      ...new Set(
        horarios.filter((h) => h.profesional_id === profesionalId).map((h) => h.dia_semana),
      ),
    ].sort((a, b) => a - b);
    return dias.map((d) => DIAS_NOMBRE[d]).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs text-slate-400">Fecha</span>
            <input
              type="date"
              className="input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs text-slate-400">Profesional</span>
            <select
              className="input"
              value={profesionalFiltro}
              onChange={(e) => setProfesionalFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              {profesionales.map((profesional) => (
                <option key={profesional.id} value={profesional.id}>
                  {profesional.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={() => abrirNueva(profesionalFiltro === 'todos' ? '' : profesionalFiltro)}
          >
            Nueva reserva
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-success-100 bg-success-50" />{' '}
          Libre
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-600" /> Reservado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-warning-100 bg-warning-50" />{' '}
          Fuera de horario
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-line bg-slate-100" /> Cerrado
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando agenda...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profesionales
            .filter((p) => profesionalFiltro === 'todos' || p.id === profesionalFiltro)
            .map((profesional) => {
              const bloquesProfesional = bloques.filter((b) => b.profesionalId === profesional.id);
              return (
                <div key={profesional.id} className="card">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-800">{profesional.nombre}</h2>
                      <p className="text-xs uppercase text-slate-400">
                        {profesional.especialidad ?? profesional.area}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-brand-600 hover:underline"
                      onClick={() => abrirNueva(profesional.id)}
                    >
                      + Reservar
                    </button>
                  </div>

                  {bloquesProfesional.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Sin bloques para esta fecha.
                      {diasTrabaja(profesional.id)
                        ? ` Trabaja: ${diasTrabaja(profesional.id)}.`
                        : ' Sin horario definido.'}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {bloquesProfesional.map((bloque) => (
                        <li key={bloque.key}>
                          <button
                            type="button"
                            disabled={bloque.estado === 'cerrado'}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${colorBloque[bloque.estado]}`}
                            onClick={() => {
                              if (bloque.estado === 'reservado' || bloque.estado === 'fuera_horario') {
                                if (bloque.reserva) {
                                  setErrorDetalle(null);
                                  setDetalle(bloque.reserva);
                                }
                              } else if (bloque.estado === 'libre') {
                                abrirNueva(profesional.id, bloque.inicio, bloque.fin);
                              }
                            }}
                          >
                            <span>
                              {formatHora(bloque.inicio)} - {formatHora(bloque.fin)}
                            </span>
                            <span className="text-xs">
                              {bloque.estado === 'reservado' && bloque.reserva
                                ? `${bloque.reserva.mascotas?.nombre ?? 'Mascota'} · ${
                                    bloque.reserva.clientes?.apellidos ?? ''
                                  }`
                                : bloque.estado === 'reservado'
                                  ? 'ocupado'
                                  : bloque.estado === 'fuera_horario'
                                    ? 'fuera de horario'
                                    : bloque.estado === 'cerrado'
                                      ? 'cerrado'
                                      : 'libre'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Reservas del dia (personal) */}
      {!esCliente && (
        <section className="card overflow-x-auto">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
            Reservas del dia ({formatFechaHora(rango.desde)})
          </h2>
          {reservas.length === 0 ? (
            <p className="text-sm text-slate-500">Sin reservas para esta fecha.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Hora</th>
                  <th className="py-2">Profesional</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Mascota</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => (
                  <tr key={reserva.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">{formatHora(reserva.inicio)}</td>
                    <td className="py-2 text-slate-600">
                      {nombreProfesional(reserva.profesional_id)}
                    </td>
                    <td className="py-2 text-slate-600">
                      {reserva.clientes
                        ? `${reserva.clientes.nombres} ${reserva.clientes.apellidos}`
                        : '-'}
                    </td>
                    <td className="py-2 text-slate-500">{reserva.mascotas?.nombre ?? '-'}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          reserva.estado === 'confirmada'
                            ? 'bg-brand-50 text-brand-700'
                            : reserva.estado === 'completada'
                              ? 'bg-success-50 text-success-700'
                              : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {reserva.estado}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {reserva.estado === 'confirmada' && (
                        <button
                          type="button"
                          className="text-danger-600 hover:underline"
                          onClick={() => void cancelarReservaPersonal(reserva.id)}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Historial de consultas (personal) */}
      {!esCliente && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase text-slate-400">
              Historial de consultas
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <RangoFiltro
                tipo={histTipo}
                onTipo={setHistTipo}
                desde={histDesde}
                hasta={histHasta}
                onDesde={setHistDesde}
                onHasta={setHistHasta}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void exportarHistorial()}
                disabled={historial.length === 0}
              >
                Exportar a Excel
              </button>
            </div>
          </div>

          {historial.length === 0 ? (
            <p className="text-sm text-slate-500">Sin consultas en el rango seleccionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Hora</th>
                    <th className="py-2">Profesional</th>
                    <th className="py-2">Dueno</th>
                    <th className="py-2">Mascota</th>
                    <th className="py-2">Motivo</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((reserva) => (
                    <tr key={reserva.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-600">{formatFecha(reserva.inicio)}</td>
                      <td className="py-2 text-slate-600">{formatHora(reserva.inicio)}</td>
                      <td className="py-2 text-slate-600">
                        {nombreProfesional(reserva.profesional_id)}
                      </td>
                      <td className="py-2 text-slate-600">
                        {reserva.clientes
                          ? `${reserva.clientes.nombres} ${reserva.clientes.apellidos}`
                          : '-'}
                      </td>
                      <td className="py-2 text-slate-500">
                        {reserva.mascotas
                          ? `${reserva.mascotas.nombre} (${reserva.mascotas.especie})`
                          : '-'}
                      </td>
                      <td className="py-2 text-slate-500">{reserva.motivo ?? '-'}</td>
                      <td className="py-2 text-slate-500">{reserva.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Mis reservas (cliente) */}
      {esCliente && (
        <section className="card overflow-x-auto">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">Mis reservas</h2>
          {misReservas.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes reservas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Profesional</th>
                  <th className="py-2">Mascota</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Motivo</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {misReservas.map((reserva) => (
                  <tr key={reserva.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">{formatFechaHora(reserva.inicio)}</td>
                    <td className="py-2 text-slate-600">{reserva.profesionales?.nombre ?? '-'}</td>
                    <td className="py-2 text-slate-500">{reserva.mascotas?.nombre ?? '-'}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          reserva.estado === 'confirmada'
                            ? 'bg-brand-50 text-brand-700'
                            : reserva.estado === 'completada'
                              ? 'bg-success-50 text-success-700'
                              : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {reserva.estado}
                      </span>
                    </td>
                    <td className="py-2 text-muted">{reserva.motivo ?? '-'}</td>
                    <td className="py-2 text-right">
                      {reserva.estado === 'confirmada' && (
                        <button
                          type="button"
                          className="text-danger-600 hover:underline"
                          onClick={() => void cancelarReservaCliente(reserva.id)}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Detalle de reserva (personal) */}
      <Modal open={Boolean(detalle)} onClose={() => setDetalle(null)} title="Detalle de la reserva">
        {detalle && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-slate-400">Horario: </span>
              {formatFechaHora(detalle.inicio)} - {formatHora(detalle.fin)}
            </p>
            <p>
              <span className="text-slate-400">Estado: </span>
              {detalle.estado}
              {detalle.fuera_de_horario && ' · fuera de horario'}
            </p>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-700">Dueno</p>
              <p>
                {detalle.clientes
                  ? `${detalle.clientes.nombres} ${detalle.clientes.apellidos}`
                  : 'Sin datos'}
              </p>
              <p className="text-slate-500">RUT {detalle.clientes?.rut ?? '-'}</p>
              <p className="text-slate-500">Telefono {detalle.clientes?.telefono ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-700">Mascota</p>
              <p>{detalle.mascotas?.nombre ?? 'Sin mascota asociada'}</p>
              {detalle.mascotas && (
                <p className="text-slate-500">
                  {detalle.mascotas.especie}
                  {detalle.mascotas.raza ? ` · ${detalle.mascotas.raza}` : ''}
                  {detalle.mascotas.peso_kg ? ` · ${detalle.mascotas.peso_kg} kg` : ''}
                </p>
              )}
            </div>
            {detalle.motivo && (
              <p>
                <span className="text-slate-400">Motivo: </span>
                {detalle.motivo}
              </p>
            )}

            {errorDetalle && <p className="text-sm text-danger-600">{errorDetalle}</p>}

            {detalle.estado === 'confirmada' && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="btn-danger flex-1"
                  disabled={cambiarEstado.isPending}
                  onClick={() => void cancelarReservaPersonal(detalle.id)}
                >
                  {cambiarEstado.isPending ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setDetalle(null)}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Nueva reserva */}
      <Modal open={modalNueva} onClose={cerrarNueva} title="Nueva reserva" wide>
        <form className="space-y-4" onSubmit={guardarReserva}>
          {nuevaInicio ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-slate-600">
                <span className="text-slate-400">Profesional: </span>
                {profesionales.find((p) => p.id === nuevaProfesional)?.nombre ?? '-'}
              </p>
              <p className="text-slate-600">
                <span className="text-slate-400">Horario: </span>
                {formatFechaHora(nuevaInicio)}
                {nuevaFin ? ` - ${formatHora(nuevaFin)}` : ''}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Profesional</label>
                  <select
                    className="input"
                    value={nuevaProfesional}
                    onChange={(e) => {
                      setNuevaProfesional(e.target.value);
                      setNuevaInicio('');
                    }}
                  >
                    <option value="">Selecciona</option>
                    {profesionales.map((profesional: Profesional) => (
                      <option key={profesional.id} value={profesional.id}>
                        {profesional.nombre} ({profesional.especialidad ?? profesional.area})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fecha</label>
                  <input
                    type="date"
                    className="input"
                    value={fecha}
                    onChange={(e) => {
                      setFecha(e.target.value);
                      setNuevaInicio('');
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="label">Horario disponible</label>
                {!nuevaProfesional ? (
                  <p className="text-xs text-slate-400">Selecciona un profesional.</p>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin horarios libres para esa fecha.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.inicio}
                        type="button"
                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                          nuevaInicio && mismoInstante(nuevaInicio, slot.inicio)
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setNuevaInicio(slot.inicio);
                          setNuevaFin(slot.fin);
                        }}
                      >
                        {formatHora(slot.inicio)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {esCliente ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-medium text-slate-600">Tus datos</p>
              {!misDatos?.cliente ? (
                <p className="text-sm text-amber-700">
                  No tienes una ficha de cliente asociada. Contacta a la clinica.
                </p>
              ) : requiereCompletar ? (
                <div className="space-y-3">
                  <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                    Para reservar necesitas completar tus datos
                    {!tieneMascotas ? ' y registrar tu mascota' : ''}.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Nombres</label>
                      <input
                        className="input"
                        value={datosCliente.nombres}
                        onChange={(e) =>
                          setDatosCliente({ ...datosCliente, nombres: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Apellidos</label>
                      <input
                        className="input"
                        value={datosCliente.apellidos}
                        onChange={(e) =>
                          setDatosCliente({ ...datosCliente, apellidos: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">RUT</label>
                      <CampoRut
                        value={datosCliente.rut}
                        onChange={(valor) => setDatosCliente({ ...datosCliente, rut: valor })}
                      />
                    </div>
                    <div>
                      <label className="label">Telefono</label>
                      <CampoTelefono
                        value={datosCliente.telefono}
                        onChange={(valor) => setDatosCliente({ ...datosCliente, telefono: valor })}
                      />
                    </div>
                  </div>
                  {!tieneMascotas && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label">Nombre mascota</label>
                        <input
                          className="input"
                          value={mascotaCliente.nombre}
                          onChange={(e) =>
                            setMascotaCliente({ ...mascotaCliente, nombre: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Especie</label>
                        <select
                          className="input"
                          value={mascotaCliente.especie}
                          onChange={(e) =>
                            setMascotaCliente({
                              ...mascotaCliente,
                              especie: e.target.value as Especie,
                            })
                          }
                        >
                          <option value="perro">Perro</option>
                          <option value="gato">Gato</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Raza (opcional)</label>
                        <input
                          className="input"
                          value={mascotaCliente.raza}
                          onChange={(e) =>
                            setMascotaCliente({ ...mascotaCliente, raza: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Peso kg (opcional)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={mascotaCliente.peso_kg}
                          onChange={(e) =>
                            setMascotaCliente({ ...mascotaCliente, peso_kg: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    {misDatos.cliente.nombres} {misDatos.cliente.apellidos} · RUT{' '}
                    {misDatos.cliente.rut}
                  </p>
                  <p>Telefono {misDatos.cliente.telefono}</p>
                  <div>
                    <label className="label">Mascota</label>
                    <select
                      className="input"
                      value={mascotaId ?? ''}
                      onChange={(e) => setMascotaId(e.target.value || null)}
                    >
                      <option value="">Sin mascota</option>
                      {misDatos.mascotas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({m.especie})
                        </option>
                      ))}
                      <option value="__nueva__">Otra mascota</option>
                    </select>
                  </div>
                  {mascotaId === '__nueva__' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label">Nombre mascota</label>
                        <input
                          className="input"
                          value={mascotaCliente.nombre}
                          onChange={(e) =>
                            setMascotaCliente({ ...mascotaCliente, nombre: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Especie</label>
                        <select
                          className="input"
                          value={mascotaCliente.especie}
                          onChange={(e) =>
                            setMascotaCliente({
                              ...mascotaCliente,
                              especie: e.target.value as Especie,
                            })
                          }
                        >
                          <option value="perro">Perro</option>
                          <option value="gato">Gato</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Raza (opcional)</label>
                        <input
                          className="input"
                          value={mascotaCliente.raza}
                          onChange={(e) =>
                            setMascotaCliente({ ...mascotaCliente, raza: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Peso kg (opcional)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={mascotaCliente.peso_kg}
                          onChange={(e) =>
                            setMascotaCliente({ ...mascotaCliente, peso_kg: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Cliente</span>
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => setModoNuevoCliente((valor) => !valor)}
                >
                  {modoNuevoCliente ? 'Buscar existente' : 'Cliente nuevo'}
                </button>
              </div>

              {modoNuevoCliente ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="input"
                      placeholder="Nombres"
                      value={nuevoCliente.nombres}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Apellidos"
                      value={nuevoCliente.apellidos}
                      onChange={(e) =>
                        setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })
                      }
                    />
                    <div>
                      <CampoRut
                        value={nuevoCliente.rut}
                        onChange={(valor) => setNuevoCliente({ ...nuevoCliente, rut: valor })}
                      />
                    </div>
                    <div>
                      <CampoTelefono
                        value={nuevoCliente.telefono}
                        onChange={(valor) => setNuevoCliente({ ...nuevoCliente, telefono: valor })}
                      />
                    </div>
                    <input
                      className="input sm:col-span-2"
                      placeholder="Email (opcional)"
                      value={nuevoCliente.email}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="input"
                      placeholder="Nombre mascota"
                      value={nuevaMascota.nombre}
                      onChange={(e) => setNuevaMascota({ ...nuevaMascota, nombre: e.target.value })}
                    />
                    <select
                      className="input"
                      value={nuevaMascota.especie}
                      onChange={(e) =>
                        setNuevaMascota({ ...nuevaMascota, especie: e.target.value as Especie })
                      }
                    >
                      <option value="perro">Perro</option>
                      <option value="gato">Gato</option>
                      <option value="otro">Otro</option>
                    </select>
                    <input
                      className="input"
                      placeholder="Raza (opcional)"
                      value={nuevaMascota.raza}
                      onChange={(e) => setNuevaMascota({ ...nuevaMascota, raza: e.target.value })}
                    />
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      placeholder="Peso kg (opcional)"
                      value={nuevaMascota.peso_kg}
                      onChange={(e) => setNuevaMascota({ ...nuevaMascota, peso_kg: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={crearCliente.isPending || crearMascota.isPending}
                    onClick={() => void guardarClienteNuevo()}
                  >
                    Guardar cliente y mascota
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    className="input"
                    placeholder="Buscar por nombre o RUT"
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                  />
                  {clienteId ? (
                    <p className="text-sm text-green-700">
                      Cliente seleccionado:{' '}
                      {clientes.find((c) => c.id === clienteId)
                        ? `${clientes.find((c) => c.id === clienteId)?.nombres} ${
                            clientes.find((c) => c.id === clienteId)?.apellidos
                          }`
                        : 'nuevo'}
                    </p>
                  ) : (
                    <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
                      {clientes.slice(0, 8).map((registro) => (
                        <li key={registro.id}>
                          <button
                            type="button"
                            className="flex w-full justify-between py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setClienteId(registro.id);
                              setMascotaId(registro.mascotas[0]?.id ?? null);
                            }}
                          >
                            <span>
                              {registro.apellidos}, {registro.nombres}
                            </span>
                            <span className="text-slate-400">{registro.rut}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {clienteId && mascotasCliente.length > 0 && (
                    <div>
                      <label className="label">Mascota</label>
                      <select
                        className="input"
                        value={mascotaId ?? ''}
                        onChange={(e) => setMascotaId(e.target.value || null)}
                      >
                        <option value="">Sin mascota</option>
                        {mascotasCliente.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.especie})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Motivo</label>
            <input
              className="input"
              value={nuevaMotivo}
              onChange={(e) => setNuevaMotivo(e.target.value)}
            />
          </div>

          {!esCliente && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={nuevaForzar}
                onChange={(e) => setNuevaForzar(e.target.checked)}
              />
              Agendar fuera de horario (emergencia)
            </label>
          )}

          {errorNueva && <p className="text-sm text-danger-600">{errorNueva}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={crearReservaInterna.isPending || crearReservaCliente.isPending}
            >
              {crearReservaInterna.isPending || crearReservaCliente.isPending
                ? 'Creando...'
                : 'Crear reserva'}
            </button>
            <button type="button" className="btn-secondary" onClick={cerrarNueva}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
