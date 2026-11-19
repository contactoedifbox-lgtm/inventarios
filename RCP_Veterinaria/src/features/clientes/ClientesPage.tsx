import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCrearCliente, useCrearMascota, useClientesConMascotas } from '@/lib/hooks';
import { clienteSchema, mascotaSchema } from '@/lib/schemas';
import { formatearRut, validarRut } from '@/lib/rut';
import type { Especie } from '@/lib/types';

const CLIENTE_VACIO = { nombres: '', apellidos: '', rut: '', telefono: '', email: '' };
const MASCOTA_VACIA = { nombre: '', especie: 'perro' as Especie, raza: '', peso_kg: '' };

export function ClientesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [debounced, setDebounced] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cliente, setCliente] = useState(CLIENTE_VACIO);
  const [mascota, setMascota] = useState(MASCOTA_VACIA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(busqueda), 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const { data: clientes = [], isLoading } = useClientesConMascotas(debounced);
  const crearCliente = useCrearCliente();
  const crearMascota = useCrearMascota();

  function abrirModal() {
    setCliente(CLIENTE_VACIO);
    setMascota(MASCOTA_VACIA);
    setError(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setError(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    const clienteParsed = clienteSchema.safeParse(cliente);
    if (!clienteParsed.success) {
      setError(clienteParsed.error.issues[0]?.message ?? 'Datos del cliente invalidos');
      return;
    }

    const mascotaParsed = mascotaSchema.safeParse({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      peso_kg: mascota.peso_kg ? Number(mascota.peso_kg) : undefined,
    });
    if (!mascotaParsed.success) {
      setError(mascotaParsed.error.issues[0]?.message ?? 'Datos de la mascota invalidos');
      return;
    }

    try {
      const clienteId = await crearCliente.mutateAsync({
        nombres: clienteParsed.data.nombres,
        apellidos: clienteParsed.data.apellidos,
        rut: clienteParsed.data.rut,
        telefono: clienteParsed.data.telefono,
        email: clienteParsed.data.email || null,
      });

      await crearMascota.mutateAsync({
        cliente_id: clienteId,
        nombre: mascotaParsed.data.nombre,
        especie: mascotaParsed.data.especie,
        raza: mascotaParsed.data.raza || null,
        peso_kg: mascotaParsed.data.peso_kg ?? null,
      });

      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Clientes y mascotas</h1>
        <button type="button" className="btn-primary" onClick={abrirModal}>
          Nuevo cliente
        </button>
      </div>

      <div className="card">
        <input
          className="input"
          placeholder="Buscar por nombre, RUT o telefono"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-slate-500">Sin clientes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Cliente</th>
                <th className="py-2">RUT</th>
                <th className="py-2">Telefono</th>
                <th className="py-2">Email</th>
                <th className="py-2">Mascotas</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((registro) => (
                <tr key={registro.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700">
                    {registro.apellidos}, {registro.nombres}
                  </td>
                  <td className="py-2 text-slate-500">{registro.rut}</td>
                  <td className="py-2 text-slate-500">{registro.telefono}</td>
                  <td className="py-2 text-slate-500">{registro.email ?? '-'}</td>
                  <td className="py-2 text-slate-500">
                    {registro.mascotas.length === 0
                      ? '-'
                      : registro.mascotas
                          .map((m) => `${m.nombre} (${m.especie})`)
                          .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalAbierto} onClose={cerrarModal} title="Nuevo cliente y mascota" wide>
        <form className="space-y-5" onSubmit={guardar}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-600">Datos del cliente</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Nombres</label>
                <input
                  className="input"
                  value={cliente.nombres}
                  onChange={(e) => setCliente({ ...cliente, nombres: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Apellidos</label>
                <input
                  className="input"
                  value={cliente.apellidos}
                  onChange={(e) => setCliente({ ...cliente, apellidos: e.target.value })}
                />
              </div>
              <div>
                <label className="label">RUT</label>
                <input
                  className="input"
                  placeholder="12.345.678-5"
                  value={cliente.rut}
                  onChange={(e) => setCliente({ ...cliente, rut: formatearRut(e.target.value) })}
                />
                {cliente.rut.length > 3 && !validarRut(cliente.rut) && (
                  <p className="mt-1 text-xs text-danger-600">RUT invalido</p>
                )}
              </div>
              <div>
                <label className="label">Telefono</label>
                <input
                  className="input"
                  value={cliente.telefono}
                  onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Email (opcional)</label>
                <input
                  className="input"
                  value={cliente.email}
                  onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-600">Datos de la mascota</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Nombre</label>
                <input
                  className="input"
                  value={mascota.nombre}
                  onChange={(e) => setMascota({ ...mascota, nombre: e.target.value })}
                />
              </div>
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
                <label className="label">Raza (opcional)</label>
                <input
                  className="input"
                  value={mascota.raza}
                  onChange={(e) => setMascota({ ...mascota, raza: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Peso kg (opcional)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={mascota.peso_kg}
                  onChange={(e) => setMascota({ ...mascota, peso_kg: e.target.value })}
                />
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={crearCliente.isPending || crearMascota.isPending}
            >
              Guardar cliente y mascota
            </button>
            <button type="button" className="btn-secondary" onClick={cerrarModal}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
