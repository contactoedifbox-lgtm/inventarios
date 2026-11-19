import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { loginSchema } from '@/lib/schemas';
import { isSupabaseConfigured } from '@/lib/supabase';

const LOGO = `${import.meta.env.BASE_URL}logo-lanka.jpeg`;

export function LoginPage() {
  const { iniciarSesion, iniciarConGoogle, recuperarClave, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false);

  const destino = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (session) {
      navigate(destino, { replace: true });
    }
  }, [session, navigate, destino]);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setMensaje(null);

    const resultado = loginSchema.safeParse({ email, password });
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion(resultado.data.email, resultado.data.password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRecuperar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setMensaje(null);

    if (!email.trim()) {
      setError('Escribe tu correo');
      return;
    }

    setEnviando(true);
    try {
      await recuperarClave(email.trim());
      setMensaje('Si el correo existe, te enviamos un enlace para crear tu contrasena.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace');
    } finally {
      setEnviando(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await iniciarConGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar con Google');
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface shadow-sm">
            <img
              src={LOGO}
              alt="Lanka Pet Care"
              className="h-24 w-24 rounded-full object-cover"
            />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-brand-700">Lanka Pet Care</h1>
          <p className="mt-1 text-sm text-muted">
            {modoRecuperar ? 'Recuperar contrasena' : 'Acceso del personal y clientes'}
          </p>
        </div>

        {modoRecuperar ? (
          <form className="card space-y-4" onSubmit={handleRecuperar}>
            <div>
              <label className="label" htmlFor="email-rec">
                Correo
              </label>
              <input
                id="email-rec"
                type="email"
                className="input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger-600">{error}</p>}
            {mensaje && <p className="text-sm text-success-700">{mensaje}</p>}

            <button type="submit" className="btn-primary w-full" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <button
              type="button"
              className="w-full text-center text-sm text-muted hover:text-brand-700"
              onClick={() => {
                setModoRecuperar(false);
                setError(null);
                setMensaje(null);
              }}
            >
              Volver a iniciar sesion
            </button>
          </form>
        ) : (
          <form className="card space-y-4" onSubmit={handleSubmit}>
            {!isSupabaseConfigured && (
              <p className="rounded-lg bg-warning-50 p-3 text-xs text-warning-700">
                Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
              </p>
            )}

            <div>
              <label className="label" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                type="email"
                className="input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={enviando}>
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>

            <button
              type="button"
              className="w-full text-center text-sm text-muted hover:text-brand-700"
              onClick={() => {
                setModoRecuperar(true);
                setError(null);
              }}
            >
              Olvide mi contrasena
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-muted">o</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => void handleGoogle()}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
                />
              </svg>
              Continuar con Google
            </button>
          </form>
        )}

        {!modoRecuperar && (
          <p className="mt-4 text-center text-sm text-muted">
            No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium text-brand-700 hover:underline">
              Crear cuenta
            </Link>
          </p>
        )}

        <p className="mt-2 text-center text-xs text-muted">
          Reserva publica disponible en <span className="font-mono">#/reservar</span>
        </p>
      </div>
    </div>
  );
}
