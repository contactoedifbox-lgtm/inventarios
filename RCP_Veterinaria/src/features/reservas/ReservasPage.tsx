import { useAuth } from '@/features/auth/AuthProvider';
import {
  useCambiarEstadoEncargo,
  useCancelarReservaProducto,
  useEncargos,
  useMarcarReservaRetirada,
  useProgramarEntregaEncargo,
  useReservasProducto,
} from '@/lib/hooks';
import { formatFecha, formatFechaHora } from '@/lib/format';
import type { ReservaProducto } from '@/lib/types';

function estadoEfectivo(reserva: ReservaProducto): ReservaProducto['estado'] {
  if (reserva.estado === 'pendiente' && new Date(reserva.expira_at) < new Date()) {
    return 'vencida';
  }
  return reserva.estado;
}

/**
 * Pestaña interna (maestro/vendedor/veterinario/peluquero) para gestionar las
 * reservas de productos y los encargos. Solo el maestro puede programar la
 * fecha de entrega de un encargo.
 */
export function ReservasPage() {
  const { esMaestro } = useAuth();
  const { data: reservas = [], isLoading: cargandoReservas } = useReservasProducto();
  const { data: encargos = [], isLoading: cargandoEncargos } = useEncargos();
  const cancelarReserva = useCancelarReservaProducto();
  const marcarRetirada = useMarcarReservaRetirada();
  const cambiarEstadoEncargo = useCambiarEstadoEncargo();
  const programarEntrega = useProgramarEntregaEncargo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reservas y encargos</h1>
        <p className="text-sm text-slate-500">
          Reservas de productos y encargos de clientes. Solo el maestro puede programar la fecha de
          entrega.
        </p>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
          Reservas de productos
        </h2>
        {cargandoReservas ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : reservas.length === 0 ? (
          <p className="text-sm text-slate-500">Sin reservas.</p>
        ) : (
          <table className="tabla-movil w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Producto</th>
                <th className="py-2">Solicitante</th>
                <th className="py-2 pr-10 text-right">Cantidad</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Retirar antes de</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => {
                const estado = estadoEfectivo(reserva);
                return (
                  <tr key={reserva.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700" data-label="Producto">
                      {reserva.producto_nombre}
                    </td>
                    <td className="py-2 text-slate-500" data-label="Solicitante">
                      {reserva.perfil_nombre ?? '-'}
                    </td>
                    <td className="py-2 pr-10 text-right" data-label="Cantidad">
                      {reserva.cantidad}
                    </td>
                    <td className="py-2" data-label="Estado">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          estado === 'pendiente'
                            ? 'bg-warning-50 text-warning-700'
                            : estado === 'retirada'
                              ? 'bg-success-50 text-success-700'
                              : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {estado}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500" data-label="Retirar antes de">
                      {formatFechaHora(reserva.expira_at)}
                    </td>
                    <td className="py-2 text-right" data-label="">
                      {estado === 'pendiente' && (
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            className="text-success-600 hover:underline"
                            onClick={() => marcarRetirada.mutate(reserva.id)}
                          >
                            Retirada
                          </button>
                          <button
                            type="button"
                            className="text-danger-600 hover:underline"
                            onClick={() => cancelarReserva.mutate(reserva.id)}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
          Encargos de productos
        </h2>
        {cargandoEncargos ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : encargos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin encargos.</p>
        ) : (
          <table className="tabla-movil w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Producto</th>
                <th className="py-2">Solicitante</th>
                <th className="py-2 pr-10 text-right">Cantidad</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Fecha encargo</th>
                <th className="py-2">Fecha entrega</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {encargos.map((encargo) => (
                <tr key={encargo.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700" data-label="Producto">
                    {encargo.producto_nombre}
                  </td>
                  <td className="py-2 text-slate-500" data-label="Solicitante">
                    {encargo.perfil_nombre ?? '-'}
                  </td>
                  <td className="py-2 pr-10 text-right" data-label="Cantidad">
                    {encargo.cantidad}
                  </td>
                  <td className="py-2" data-label="Estado">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        encargo.estado === 'pendiente'
                          ? 'bg-warning-50 text-warning-700'
                          : encargo.estado === 'entregado'
                            ? 'bg-success-50 text-success-700'
                            : 'bg-slate-100 text-muted'
                      }`}
                    >
                      {encargo.estado}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500" data-label="Fecha encargo">
                    {formatFechaHora(encargo.created_at)}
                  </td>
                  <td className="py-2" data-label="Fecha entrega">
                    {esMaestro ? (
                      <input
                        type="date"
                        className="input"
                        value={encargo.fecha_entrega ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            programarEntrega.mutate({ id: encargo.id, fecha: e.target.value });
                          }
                        }}
                      />
                    ) : encargo.fecha_entrega ? (
                      formatFecha(encargo.fecha_entrega)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2 text-right" data-label="">
                    {encargo.estado === 'pendiente' && (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-success-600 hover:underline"
                          onClick={() =>
                            cambiarEstadoEncargo.mutate({ id: encargo.id, estado: 'entregado' })
                          }
                        >
                          Entregado
                        </button>
                        <button
                          type="button"
                          className="text-danger-600 hover:underline"
                          onClick={() =>
                            cambiarEstadoEncargo.mutate({ id: encargo.id, estado: 'cancelado' })
                          }
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
