import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { loginSchema } from '@/lib/schemas';
import { isSupabaseConfigured } from '@/lib/supabase';

const LOGO = `${import.meta.env.BASE_URL}logo-lanka.jpeg`;

export function LoginPage() {
  const { iniciarSesion, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = (location.state as { from?: string } | null)?.from ?? '/';

  if (session) {
    navigate(destino, { replace: true });
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

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
          <p className="mt-1 text-sm text-muted">Acceso del personal</p>
        </div>

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
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Reserva publica disponible en <span className="font-mono">#/reservar</span>
        </p>
      </div>
    </div>
  );
}
