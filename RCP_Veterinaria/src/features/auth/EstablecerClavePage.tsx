import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const LOGO = `${import.meta.env.BASE_URL}logo-lanka.jpeg`;

export function EstablecerClavePage() {
  const { actualizarClave, session, modoRecuperacion } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (password !== password2) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      await actualizarClave(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contrasena');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface shadow-sm">
            <img
              src={LOGO}
              alt="Lanka Pet Care"
              className="h-20 w-20 rounded-full object-cover"
            />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-brand-700">Establece tu contrasena</h1>
          <p className="mt-1 text-sm text-muted">
            {session?.user?.email
              ? `Cuenta: ${session.user.email}`
              : 'Crea la contrasena con la que ingresaras'}
          </p>
        </div>

        {!session || !modoRecuperacion ? (
          <div className="card space-y-3 text-center">
            <p className="text-sm text-warning-700">
              El enlace no es valido o ya expiro. Solicita uno nuevo desde la pantalla de ingreso.
            </p>
            <Link to="/login" className="btn-primary w-full">
              Ir a iniciar sesion
            </Link>
          </div>
        ) : (
          <form className="card space-y-4" onSubmit={handleSubmit}>
            <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
              Vas a crear la contrasena de <strong>{session.user.email}</strong>. Si no es tu
              cuenta, cierra esta pagina.
            </p>
            <div>
              <label className="label" htmlFor="password">
                Nueva contrasena
              </label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="password2">
                Repite la contrasena
              </label>
              <input
                id="password2"
                type="password"
                className="input"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={enviando}>
              {enviando ? 'Guardando...' : 'Guardar contrasena'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
