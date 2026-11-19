import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CampoRut } from '@/components/ui/CampoRut';
import { CampoTelefono } from '@/components/ui/CampoTelefono';
import {
  useConfigPublica,
  useCrearReservaPublica,
  useHorariosDisponibles,
  useProfesionalesPublicos,
} from '@/lib/hooks';
import { reservaPublicaSchema } from '@/lib/schemas';
import { normalizarRut } from '@/lib/rut';
import { formatFechaHora, normalizarTelefono } from '@/lib/format';
import type { Especie } from '@/lib/types';

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, opciones: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

export function ReservaPublicaPage() {
  const { data: profesionales = [] } = useProfesionalesPublicos();
  const { data: config } = useConfigPublica();
  const crear = useCrearReservaPublica();

  const [profesionalId, setProfesionalId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [motivo, setMotivo] = useState('');
  const [consentimiento, setConsentimiento] = useState(false);
  const [cliente, setCliente] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    telefono: '',
    email: '',
  });
  const [mascota, setMascota] = useState({
    nombre: '',
    especie: 'perro' as Especie,
    raza: '',
    peso_kg: '',
  });
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ token: string } | null>(null);

  const maxDias = config?.reserva_max_dias ?? 60;
  const hasta = useMemo(() => {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
    const mm = String(siguiente.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(siguiente.getUTCDate()).padStart(2, '0');
    return `${siguiente.getUTCFullYear()}-${mm}-${dd}`;
  }, [fecha]);

  const { data: slots = [] } = useHorariosDisponibles(profesionalId || null, fecha, hasta);

  // Carga y renderiza el widget de Cloudflare Turnstile.
  useEffect(() => {
    if (!SITE_KEY) return;

    let widgetId: string | undefined;
    const intervalo = setInterval(() => {
      if (window.turnstile) {
        clearInterval(intervalo);
        widgetId = window.turnstile.render('#turnstile', {
          sitekey: SITE_KEY,
          callback: (valor: string) => setToken(valor),
        });
      }
    }, 300);

    return () => {
      clearInterval(intervalo);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    const parsed = reservaPublicaSchema.safeParse({
      profesional_id: profesionalId,
      inicio: slot,
      motivo,
      consentimiento,
      cliente,
      mascota: {
        nombre: mascota.nombre,
        especie: mascota.especie,
        raza: mascota.raza,
        peso_kg: mascota.peso_kg ? Number(mascota.peso_kg) : undefined,
      },
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario');
      return;
    }

    if (SITE_KEY && !token) {
      setError('Completa la verificacion anti-bot');
      return;
    }

    try {
      const resultado = await crear.mutateAsync({
        profesional_id: profesionalId,
        inicio: slot,
        motivo,
        turnstile_token: token,
        cliente: {
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          rut: normalizarRut(cliente.rut),
          telefono: normalizarTelefono(cliente.telefono),
          email: cliente.email || undefined,
        },
        mascota: {
          nombre: mascota.nombre,
          especie: mascota.especie,
          raza: mascota.raza || undefined,
          peso_kg: mascota.peso_kg ? Number(mascota.peso_kg) : null,
        },
      });
      setExito({ token: resultado.token_gestion });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva');
    }
  }

  if (exito) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-green-700">Reserva confirmada</h1>
        <p className="mt-2 text-sm text-slate-600">
          Guarda este codigo para gestionar o cancelar tu reserva:
        </p>
        <p className="mt-3 break-all rounded-lg bg-slate-100 p-3 font-mono text-sm">{exito.token}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-brand-700">
          {config?.nombre_negocio ?? 'LankaPets'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Reserva tu hora · Veterinaria y peluqueria</p>
      </header>

      <form className="card space-y-4" onSubmit={enviar}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Profesional</label>
            <select
              className="input"
              value={profesionalId}
              onChange={(e) => {
                setProfesionalId(e.target.value);
                setSlot('');
              }}
            >
              <option value="">Selecciona</option>
              {profesionales.map((profesional) => (
                <option key={profesional.id} value={profesional.id}>
                  {profesional.nombre} ({profesional.area})
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
              max={new Date(Date.now() + maxDias * 86400000).toISOString().slice(0, 10)}
              onChange={(e) => {
                setFecha(e.target.value);
                setSlot('');
              }}
            />
          </div>
        </div>

        <div>
          <label className="label">Horario disponible</label>
          {!profesionalId ? (
            <p className="text-xs text-slate-400">Selecciona un profesional para ver horarios.</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-slate-400">Sin horarios disponibles para esa fecha.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((opcion) => (
                <button
                  key={opcion.inicio}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    slot === opcion.inicio
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => setSlot(opcion.inicio)}
                >
                  {formatFechaHora(opcion.inicio)}
                </button>
              ))}
            </div>
          )}
        </div>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-600">Tus datos</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Nombres"
              value={cliente.nombres}
              onChange={(e) => setCliente({ ...cliente, nombres: e.target.value })}
            />
            <input
              className="input"
              placeholder="Apellidos"
              value={cliente.apellidos}
              onChange={(e) => setCliente({ ...cliente, apellidos: e.target.value })}
            />
            <div>
              <CampoRut
                value={cliente.rut}
                onChange={(valor) => setCliente({ ...cliente, rut: valor })}
              />
            </div>
            <div>
              <CampoTelefono
                value={cliente.telefono}
                onChange={(valor) => setCliente({ ...cliente, telefono: valor })}
              />
            </div>
            <input
              className="input sm:col-span-2"
              placeholder="Email (opcional)"
              value={cliente.email}
              onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-600">Tu mascota</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Nombre"
              value={mascota.nombre}
              onChange={(e) => setMascota({ ...mascota, nombre: e.target.value })}
            />
            <select
              className="input"
              value={mascota.especie}
              onChange={(e) => setMascota({ ...mascota, especie: e.target.value as Especie })}
            >
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
            <input
              className="input"
              placeholder="Raza (opcional)"
              value={mascota.raza}
              onChange={(e) => setMascota({ ...mascota, raza: e.target.value })}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Peso kg (opcional)"
              value={mascota.peso_kg}
              onChange={(e) => setMascota({ ...mascota, peso_kg: e.target.value })}
            />
          </div>
        </fieldset>

        <div>
          <label className="label">Motivo</label>
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-1"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
          />
          Autorizo el tratamiento de mis datos personales para gestionar la reserva.
        </label>

        {SITE_KEY && <div id="turnstile" />}

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={crear.isPending}>
          {crear.isPending ? 'Enviando...' : 'Solicitar reserva'}
        </button>
      </form>
    </div>
  );
}
