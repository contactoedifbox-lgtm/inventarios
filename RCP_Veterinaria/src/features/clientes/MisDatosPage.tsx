import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CampoRut } from '@/components/ui/CampoRut';
import { CampoTelefono } from '@/components/ui/CampoTelefono';
import { useActualizarMisDatos, useCrearMascota, useMisDatos } from '@/lib/hooks';
import { normalizarRut } from '@/lib/rut';
import { normalizarTelefono } from '@/lib/format';
import { mascotaSchema } from '@/lib/schemas';
import type { Especie } from '@/lib/types';

const MASCOTA_VACIA = { nombre: '', especie: 'perro' as Especie, raza: '', peso_kg: '' };

export function MisDatosPage() {
  const { data, isLoading } = useMisDatos();
  const actualizar = useActualizarMisDatos();
  const crearMascota = useCrearMascota();

  const [form, setForm] = useState({ nombres: '', apellidos: '', rut: '', telefono: '' });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [modalMascota, setModalMascota] = useState(false);
  const [mascota, setMascota] = useState(MASCOTA_VACIA);
  const [errorMascota, setErrorMascota] = useState<string | null>(null);

  useEffect(() => {
    if (data?.cliente) {
      setForm({
        nombres: data.cliente.nombres,
        apellidos: data.cliente.apellidos,
        rut: data.cliente.rut === 'ANONIMO' ? '' : data.cliente.rut,
        telefono: data.cliente.telefono === 'ANONIMO' ? '' : data.cliente.telefono,
      });
    }
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted">Cargando tus datos...</p>;
  }

  if (!data?.cliente) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-ink">Mis datos</h1>
        <p className="mt-2 text-sm text-warning-700">
          No tienes una ficha de cliente asociada a tu correo. Contacta a la clinica para
          registrarte.
        </p>
      </div>
    );
  }

  const { cliente, mascotas } = data;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setOk(false);

    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError('Nombre y apellido son obligatorios');
      return;
    }

    try {
      await actualizar.mutateAsync({
        nombres: form.nombres,
        apellidos: form.apellidos,
        rut: normalizarRut(form.rut),
        telefono: normalizarTelefono(form.telefono),
      });
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar tus datos');
    }
  }

  function abrirMascota() {
    setMascota(MASCOTA_VACIA);
    setErrorMascota(null);
    setModalMascota(true);
  }

  function cerrarMascota() {
    setModalMascota(false);
    setErrorMascota(null);
  }

  async function guardarMascota(evento: FormEvent) {
    evento.preventDefault();
    setErrorMascota(null);

    const parsed = mascotaSchema.safeParse({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      peso_kg: mascota.peso_kg ? Number(mascota.peso_kg) : undefined,
    });
    if (!parsed.success) {
      setErrorMascota(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    try {
      await crearMascota.mutateAsync({
        cliente_id: cliente.id,
        nombre: parsed.data.nombre,
        especie: parsed.data.especie,
        raza: parsed.data.raza || null,
        peso_kg: parsed.data.peso_kg ?? null,
      });
      cerrarMascota();
    } catch (err) {
      setErrorMascota(err instanceof Error ? err.message : 'No se pudo registrar la mascota');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Mis datos</h1>

      <form className="card space-y-4" onSubmit={guardar}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Datos personales
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nombres">
              Nombres
            </label>
            <input
              id="nombres"
              className="input"
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="apellidos">
              Apellidos
            </label>
            <input
              id="apellidos"
              className="input"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rut">
              RUT
            </label>
            <CampoRut
              id="rut"
              value={form.rut}
              onChange={(valor) => setForm({ ...form, rut: valor })}
            />
          </div>
          <div>
            <label className="label" htmlFor="telefono">
              Telefono
            </label>
            <CampoTelefono
              id="telefono"
              value={form.telefono}
              onChange={(valor) => setForm({ ...form, telefono: valor })}
            />
          </div>
        </div>

        <p className="text-sm text-muted">Email {cliente.email ?? '-'}</p>

        {error && <p className="text-sm text-danger-600">{error}</p>}
        {ok && <p className="text-sm text-success-700">Datos guardados correctamente.</p>}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Mis mascotas</h2>
          <button type="button" className="btn-primary" onClick={abrirMascota}>
            Registrar mascota
          </button>
        </div>
        {mascotas.length === 0 ? (
          <p className="text-sm text-muted">
            Sin mascotas registradas. Agrega tu primera mascota con el boton de arriba.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="py-2">Nombre</th>
                <th className="py-2">Especie</th>
                <th className="py-2">Raza</th>
                <th className="py-2 text-right">Peso</th>
              </tr>
            </thead>
            <tbody>
              {mascotas.map((mascota) => (
                <tr key={mascota.id} className="border-b border-line">
                  <td className="py-2 text-ink">{mascota.nombre}</td>
                  <td className="py-2 text-muted">{mascota.especie}</td>
                  <td className="py-2 text-muted">{mascota.raza ?? '-'}</td>
                  <td className="py-2 text-right text-muted">
                    {mascota.peso_kg != null ? `${mascota.peso_kg} kg` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted">
        Estos datos se precargan al reservar una hora. Puedes registrar y ver tus mascotas aqui.
      </p>

      <Modal open={modalMascota} onClose={cerrarMascota} title="Registrar mascota">
        <form className="space-y-3" onSubmit={guardarMascota}>
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={mascota.nombre}
              onChange={(e) => setMascota({ ...mascota, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Especie</label>
              <select
                className="input"
                value={mascota.especie}
                onChange={(e) => setMascota({ ...mascota, especie: e.target.value as Especie })}
              >
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Peso (kg, opcional)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                className="input"
                value={mascota.peso_kg}
                onChange={(e) => setMascota({ ...mascota, peso_kg: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Raza (opcional)</label>
            <input
              className="input"
              value={mascota.raza}
              onChange={(e) => setMascota({ ...mascota, raza: e.target.value })}
            />
          </div>

          {errorMascota && <p className="text-sm text-danger-600">{errorMascota}</p>}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={crearMascota.isPending}>
              {crearMascota.isPending ? 'Guardando...' : 'Registrar mascota'}
            </button>
            <button type="button" className="btn-secondary" onClick={cerrarMascota}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
