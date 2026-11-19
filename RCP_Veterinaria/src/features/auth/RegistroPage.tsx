import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { registroClienteSchema } from '@/lib/schemas';
import { isSupabaseConfigured } from '@/lib/supabase';

const LOGO = `${import.meta.env.BASE_URL}logo-lanka.jpeg`;

const FORM_VACIO = {
  nombres: '',
  apellidos: '',
  rut: '',
  telefono: '',
  email: '',
  password: '',
  consentimiento: false,
};

export function RegistroPage() {
  const { registrarse, iniciarConGoogle, session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(false);

  if (session) {
    navigate('/', { replace: true });
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    const resultado = registroClienteSchema.safeParse(form);
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setEnviando(true);
    try {
      const { requiereConfirmacion } = await registrarse({
        nombres: resultado.data.nombres,
        apellidos: resultado.data.apellidos,
        rut: resultado.data.rut,
        telefono: resultado.data.telefono,
        email: resultado.data.email,
        password: resultado.data.password,
      });

      if (requiereConfirmacion) {
        setConfirmacion(true);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
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

  if (confirmacion) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
        <div className="card w-full max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-bold text-brand-700">Revisa tu correo</h1>
          <p className="text-sm text-muted">
            Te enviamos un enlace de confirmacion a <strong>{form.email}</strong>. Confirma tu
            correo para activar la cuenta y luego inicia sesion.
          </p>
          <Link to="/login" className="btn-primary w-full">
            Ir a iniciar sesion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface shadow-sm">
            <img
              src={LOGO}
              alt="Lanka Pet Care"
              className="h-20 w-20 rounded-full object-cover"
            />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-brand-700">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted">Registrate para reservar y gestionar tus horas</p>
        </div>

        <form className="card space-y-4" onSubmit={handleSubmit}>
          {!isSupabaseConfigured && (
            <p className="rounded-lg bg-warning-50 p-3 text-xs text-warning-700">
              Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nombres">
                Nombres
              </label>
              <input
                id="nombres"
                className="input"
                autoComplete="given-name"
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
                autoComplete="family-name"
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
              <input
                id="rut"
                className="input"
                placeholder="11111111-1"
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="telefono">
                Telefono
              </label>
              <input
                id="telefono"
                className="input"
                autoComplete="tel"
                placeholder="+56 9 1234 5678"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.consentimiento}
              onChange={(e) => setForm({ ...form, consentimiento: e.target.checked })}
            />
            Acepto el tratamiento de mis datos personales para la gestion de reservas y atenciones.
          </label>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">o</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <button type="button" className="btn-secondary w-full" onClick={() => void handleGoogle()}>
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

        <p className="mt-4 text-center text-sm text-muted">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
