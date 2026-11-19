import { useMisDatos } from '@/lib/hooks';

export function MisDatosPage() {
  const { data, isLoading } = useMisDatos();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando tus datos...</p>;
  }

  if (!data?.cliente) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-slate-800">Mis datos</h1>
        <p className="mt-2 text-sm text-amber-700">
          No tienes una ficha de cliente asociada a tu correo. Contacta a la clinica para
          registrarte.
        </p>
      </div>
    );
  }

  const { cliente, mascotas } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Mis datos</h1>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold uppercase text-slate-400">Datos personales</h2>
        <p className="text-slate-700">
          {cliente.nombres} {cliente.apellidos}
        </p>
        <p className="text-sm text-slate-500">RUT {cliente.rut}</p>
        <p className="text-sm text-slate-500">Telefono {cliente.telefono}</p>
        <p className="text-sm text-slate-500">Email {cliente.email ?? '-'}</p>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">Mis mascotas</h2>
        {mascotas.length === 0 ? (
          <p className="text-sm text-slate-500">Sin mascotas registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Nombre</th>
                <th className="py-2">Especie</th>
                <th className="py-2">Raza</th>
                <th className="py-2 text-right">Peso</th>
              </tr>
            </thead>
            <tbody>
              {mascotas.map((mascota) => (
                <tr key={mascota.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{mascota.nombre}</td>
                  <td className="py-2 text-slate-500">{mascota.especie}</td>
                  <td className="py-2 text-slate-500">{mascota.raza ?? '-'}</td>
                  <td className="py-2 text-right text-slate-500">
                    {mascota.peso_kg != null ? `${mascota.peso_kg} kg` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Estos datos se precargan al reservar una hora. Para modificarlos, contacta a la clinica.
      </p>
    </div>
  );
}